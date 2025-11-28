/**
 * Backfill script: re-upgrade IndiaMART SavedListing images that currently point
 * to a known bad blurry placeholder hash (see BAD_IMAGE_HASHES).
 *
 * Strategy:
 *  1. Query SavedListing rows where platform=INDIAMART AND image like '/cache/%'
 *  2. Filter those whose cached path contains a BAD_IMAGE_HASHES hash.
 *  3. For each, attempt to re-derive a better detail image via getIndiaMartDetailMainImage.
 *  4. If a better (non-bad-hash) image is found, pass through cacheExternalImage (force JPG) and update the row.
 *  5. Supports --limit and --dry-run flags.
 *
 * Usage:
 *   pnpm ts-node scripts/backfillIndiaMartBadImages.ts --limit 250
 *   pnpm ts-node scripts/backfillIndiaMartBadImages.ts --dry-run 1
 */
import { PrismaClient, SourcePlatform } from '@prisma/client';
import { BAD_IMAGE_HASHES, isBadImageHashFromPath } from '../src/lib/badImages';
import { getIndiaMartDetailMainImage, getIndiaMartDetailImageCandidates, headlessIndiaMartDetailImage } from '../src/lib/providers/indiamart';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';

interface Args { limit: number; dryRun: boolean; concurrency: number; debug: boolean; headless: boolean; allowFallback: boolean; forage: boolean; forageLimit: number; nullOnFailure: boolean; curated: boolean; minBytes: number; }
function parseArgs(argv: string[]): Args {
  const out: Args = { limit: 500, dryRun: false, concurrency: 4, debug: false, headless: false, allowFallback: true, forage: true, forageLimit: 6, nullOnFailure: false, curated: true, minBytes: 4200 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, raw] = a.includes('=') ? a.split(/=(.*)/) : [a, argv[i + 1]];
    const take = () => { if (!a.includes('=')) i++; return raw; };
    switch (k) {
      case '--limit': out.limit = Math.max(1, Math.min(5000, Number(take()) || out.limit)); break;
      case '--dry-run': out.dryRun = /^(1|true|yes)$/i.test(String(take())); break;
      case '--concurrency': out.concurrency = Math.max(1, Math.min(16, Number(take()) || out.concurrency)); break;
      case '--debug': out.debug = /^(1|true|yes)$/i.test(String(take())); break;
      case '--headless': out.headless = /^(1|true|yes)$/i.test(String(take())); break;
      case '--allow-fallback': out.allowFallback = /^(1|true|yes)$/i.test(String(take())); break;
      case '--forage': out.forage = /^(1|true|yes)$/i.test(String(take())); break;
      case '--forage-limit': out.forageLimit = Math.max(1, Math.min(20, Number(take()) || out.forageLimit)); break;
      case '--null-on-failure': out.nullOnFailure = /^(1|true|yes)$/i.test(String(take())); break;
      case '--curated': out.curated = /^(1|true|yes)$/i.test(String(take())); break;
      case '--min-bytes': out.minBytes = Math.max(500, Math.min(20000, Number(take()) || out.minBytes)); break;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();
  console.log(`[BackfillIMBadImages] Start limit=${args.limit} dryRun=${args.dryRun} concurrency=${args.concurrency} debug=${args.debug} headless=${args.headless} allowFallback=${args.allowFallback} forage=${args.forage} curated=${args.curated} nullOnFailure=${args.nullOnFailure} minBytes=${args.minBytes}`);
  const candidates = await prisma.savedListing.findMany({
    where: {
      platform: SourcePlatform.INDIAMART,
      image: { startsWith: '/cache/' }
    },
    select: { id: true, url: true, image: true, title: true, terms: true, categories: true },
    take: args.limit * 2 // over-fetch then filter client-side
  });
  const badOnes = candidates.filter(c => c.image && isBadImageHashFromPath(c.image));
  console.log(`[BackfillIMBadImages] Fetched=${candidates.length} badHashMatches=${badOnes.length}`);
  const target = badOnes.slice(0, args.limit);
  let improved = 0; let skipped = 0; let failures = 0; let nullified = 0; let forageHits = 0; let headlessHits = 0; let variantHits = 0; let curatedApplied = 0;
  const badHashCounts: Record<string, number> = {};
  let idx = 0;
  async function worker() {
    while (idx < target.length) {
      const i = idx++;
      const row = target[i];
      try {
        // Helper: variant heuristic - try to upscale dimension tokens
        const buildVariants = (u: string): string[] => {
          if (!u) return [];
          const parts: string[] = [];
            // Replace common small NxN with larger squares
          const dimRe = /(\b|_)(?:[12]?\d{2})x(?:[12]?\d{2})(\b|_)/i;
          if (dimRe.test(u)) {
            ['800x800','1000x1000','1200x1200'].forEach(sz => parts.push(u.replace(dimRe, `$1${sz}$2`)));
          }
          // width param
          const wRe = /([?&](?:w|width)=)(\d{2,4})/i;
          if (wRe.test(u)) ['800','1000','1200'].forEach(v => parts.push(u.replace(wRe, `$1${v}`)));
          return Array.from(new Set(parts)).filter(p => p !== u);
        };

        // Primary main image pick
        let detailBest = await getIndiaMartDetailMainImage(row.url);
        // If main image absent OR still bad, try full candidate list
        if ((!detailBest || isBadImageHashFromPath(detailBest)) && args.allowFallback) {
          const cands = await getIndiaMartDetailImageCandidates(row.url);
          if (cands.length) {
            // pick first non-bad candidate; else keep first
            const alt = cands.find(c => !isBadImageHashFromPath(c));
            if (alt) detailBest = alt; else if (!detailBest) detailBest = cands[0];
          }
        }
        // Headless attempt if still bad
        if (args.headless && detailBest && isBadImageHashFromPath(detailBest)) {
          const headless = await headlessIndiaMartDetailImage(row.url).catch(()=>null);
          if (headless && !isBadImageHashFromPath(headless)) { detailBest = headless; headlessHits++; }
        }
        // Variant attempts if still bad
        if (detailBest && isBadImageHashFromPath(detailBest)) {
          for (const variant of buildVariants(detailBest)) {
            try {
              const res = await fetch(variant, { method: 'HEAD' });
              if (res.ok) { detailBest = variant; variantHits++; break; }
            } catch {}
          }
        }
        if (!detailBest) { skipped++; if (args.debug) console.log('[skip] no detail candidates', row.id); continue; }
        if (isBadImageHashFromPath(detailBest)) { skipped++; if (args.debug) console.log('[skip] only bad candidates', row.id); continue; }
        const cached = await cacheExternalImage(detailBest, { preferJpgForIndiaMart: true });
        // Byte-size quality filter
        let usePath: string | null = cached?.localPath || null;
        if (usePath) {
          try {
            const fs = await import('node:fs/promises');
            const abs = cached!.absPath;
            const stat = await fs.stat(abs);
            if (stat.size < args.minBytes) {
              if (args.debug) console.log('[reject-small]', row.id, stat.size);
              usePath = null; // force fallback attempts
            }
          } catch {}
        }
        // Forage search fallback
        if (!usePath && args.forage) {
          const titleWords = (row as any).title?.split(/\s+/).filter((w:string)=>w.length>3).slice(0,4).join(' ');
          if (titleWords) {
            try {
              const forageListings = await fetchIndiaMart(titleWords, args.forageLimit, { upgradeImages: true, cacheImages: true });
              const altListing = forageListings.find(l => l.image && !isBadImageHashFromPath(l.image));
              if (altListing?.image) {
                const cachedAlt = altListing.image.startsWith('/cache/') ? { localPath: altListing.image } : await cacheExternalImage(altListing.image, { preferJpgForIndiaMart: true });
                if (cachedAlt?.localPath && !isBadImageHashFromPath(cachedAlt.localPath)) { usePath = cachedAlt.localPath; forageHits++; }
              }
            } catch (e) { if (args.debug) console.log('[forage-fail]', row.id, (e as any)?.message); }
          }
        }
        // Curated fallback mapping (keywords)
        if (!usePath && args.curated) {
          const t = String((row as any).title || '').toLowerCase();
          const curatedMap: [RegExp,string][] = [
            /rice|basmati|grain/, '/seed/rice.jpg',
            /wheat|flour|atta/, '/seed/wheat.jpg',
            /pulse|lentil|dal|gram/, '/seed/pulses.jpg',
            /spice|turmeric|chili|masala|cumin|coriander/, '/seed/spices.jpg'
          ].reduce<any[]>((acc,v,i,arr)=>{ if(i%2===0) acc.push([v as RegExp, arr[i+1] as string]); return acc;}, []);
          for (const [re, imgPath] of curatedMap) {
            if (re.test(t)) { usePath = imgPath; curatedApplied++; break; }
          }
        }
        if (!usePath) {
          // Optionally null out so future UI upgrade attempts happen
            if (args.nullOnFailure && !args.dryRun) {
              await prisma.savedListing.update({ where: { id: row.id }, data: { image: null } });
              nullified++;
            }
          skipped++;
          if (args.debug) console.log('[skip-final]', row.id);
          continue;
        }
        if (!cached?.localPath) { skipped++; if (args.debug) console.log('[skip] cache failed', row.id); continue; }
        if (isBadImageHashFromPath(usePath)) {
          // count bad hash occurrence
          const h = (usePath.match(/([a-f0-9]{40})/)||[])[1]; if (h) badHashCounts[h] = (badHashCounts[h]||0)+1;
          skipped++; if (args.debug) console.log('[skip] cached still bad', row.id); continue;
        }
        if (!args.dryRun) {
          await prisma.savedListing.update({ where: { id: row.id }, data: { image: usePath } });
        }
        improved++;
        if (!args.debug) {
          console.log(`[improved] id=${row.id} ${row.image} -> ${usePath}`);
        } else {
          console.log(`[improved] id=${row.id} old=${row.image} new=${usePath} (variant=${variantHits} headless=${headlessHits} forage=${forageHits})`);
        }
      } catch (e:any) {
        failures++;
        if (failures < 10) console.warn('[error]', row.id, e?.message || e);
      }
    }
  }
  const workers = Array.from({ length: Math.min(args.concurrency, target.length) }, () => worker());
  await Promise.all(workers);
  console.log(`[BackfillIMBadImages] Done improved=${improved} skipped=${skipped} failures=${failures} nullified=${nullified} forageHits=${forageHits} headlessHits=${headlessHits} variantHits=${variantHits} curated=${curatedApplied}`);
  if (Object.keys(badHashCounts).length) {
    console.log('[BadHashCounts]', JSON.stringify(badHashCounts, null, 2));
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
