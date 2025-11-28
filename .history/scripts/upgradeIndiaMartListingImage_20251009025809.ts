import { prisma } from '../src/lib/prisma';
import { getIndiaMartDetailMainImage, getIndiaMartDetailImageCandidates } from '../src/lib/providers/indiamart';
import { BAD_IMAGE_HASHES } from '../src/lib/badImages';
import { cacheExternalImage } from '../src/lib/imageCache';

/*
Upgrade IndiaMART SavedListing images for specific listing ids or all listings whose current image matches a given cache hash substring.

Usage:
  pnpm ts-node scripts/upgradeIndiaMartListingImage.ts --ids=<id1,id2,...> [--headless=1] [--dry=1]
  pnpm ts-node scripts/upgradeIndiaMartListingImage.ts --hash=bbb71cb4979e0c433b6f0ac4eabc2d688e809d39 [--headless=1] [--dry=1] [--limit=500]
  pnpm ts-node scripts/upgradeIndiaMartListingImage.ts --hash=bbb71c --limit=300

Flags:
  --ids            Comma separated SavedListing ids to upgrade
  --hash           Exact or prefix hash (without /cache/ and extension) to match current image path
  --limit          Max rows when selecting by hash prefix (default 400)
  --headless=1     Allow headless detail fallback (IM_DETAIL_HEADLESS=1)
  --dry=1          Dry run; show planned updates only
  --concurrency    Parallel workers (default 6)

Heuristics:
  - Always re-fetch detail page & rescore using improved provider logic
  - Treat known blurry hash as placeholder; if candidate resolves to same hash again, skip unless --force

Returns exit code 0 on success; non-zero on fatal error.
*/

function arg(name: string): string | undefined {
  const eqPrefix = `--${name}=`;
  const direct = process.argv.find(a => a.startsWith(eqPrefix));
  if (direct) return direct.slice(eqPrefix.length);
  const idx = process.argv.findIndex(a => a === `--${name}`);
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith('--')) return next;
    return 'true';
  }
  return undefined;
}
function flag(name: string, def = false) { const v = arg(name); if (v == null) return def; return /^(1|true|yes|on)$/i.test(v); }

(async () => {
  const idsArg = arg('ids');
  const hash = (arg('hash') || '').toLowerCase();
  const limit = parseInt(arg('limit') || '400', 10);
  const headless = flag('headless', false);
  const dry = flag('dry', false);
  const concurrency = Math.max(1, Math.min(16, parseInt(arg('concurrency') || '6', 10)));
  const aggressive = flag('aggressive', false);
  const force = flag('force', false);
  if (headless) process.env.IM_DETAIL_HEADLESS = '1';

  if (!idsArg && !hash) {
    console.error('Must provide --ids or --hash');
    process.exit(1);
  }
  const KNOWN_BLUR = new Set(['bbb71cb4979e0c433b6f0ac4eabc2d688e809d39']);

  let targets: Array<{ id: string; url: string; image: string | null }> = [];
  if (idsArg) {
    const ids = idsArg.split(',').map(s => s.trim()).filter(Boolean);
    targets = await prisma.savedListing.findMany({ where: { id: { in: ids }, platform: 'INDIAMART' }, select: { id: true, url: true, image: true } }) as any;
  } else if (hash) {
    const where: any = { platform: 'INDIAMART', image: { not: null } };
    if (hash.length === 40) {
      where.image = { contains: hash.substring(0, 20) }; // raw path includes hash + ext; use contains for safety
    } else {
      where.image = { contains: hash };
    }
    targets = await prisma.savedListing.findMany({ where, select: { id: true, url: true, image: true }, take: limit, orderBy: { updatedAt: 'asc' } }) as any;
  }

  if (!targets.length) { console.log('No targets found.'); process.exit(0); }
  console.log(`[upgradeIndiaMartListingImage] start count=${targets.length} headless=${headless} dry=${dry} force=${force} aggressive=${aggressive}`);

  const hasBlurHash = (img: string | null | undefined) => {
    if (!img) return false; const m = img.match(/([a-f0-9]{40})/i); if (!m) return false; return KNOWN_BLUR.has(m[1].toLowerCase());
  };

  let idx = 0, updated = 0, skipped = 0, errors = 0;
  async function worker() {
    while (idx < targets.length) {
      const i = idx++; const t = targets[i];
      if (!t.url) { skipped++; continue; }
      try {
        const existingBlur = hasBlurHash(t.image);
        if (!force && t.image && !existingBlur && !KNOWN_BLUR.has(hash) && !idsArg) { skipped++; continue; }
        let final: string | null = null;
        if (!aggressive) {
          const fresh = await getIndiaMartDetailMainImage(t.url);
          if (!fresh) { skipped++; continue; }
          try { const { localPath } = await cacheExternalImage(fresh, { preferJpgForIndiaMart: true }); final = localPath; } catch { final = fresh; }
          if (!force && hasBlurHash(final)) { skipped++; continue; }
        } else {
          // Aggressive: fetch all candidates & iterate until non-bad hash cached
          const candidates = await getIndiaMartDetailImageCandidates(t.url);
          if (!candidates.length) { skipped++; continue; }
          let updatedOk = false;
          for (const cand of candidates) {
            let cachedPath = cand;
            try { const { localPath } = await cacheExternalImage(cand, { preferJpgForIndiaMart: true }); cachedPath = localPath; } catch {}
            const m = cachedPath.match(/([a-f0-9]{40})/i);
            const hash = m ? m[1].toLowerCase() : null;
            if (hash && BAD_IMAGE_HASHES.has(hash)) {
              // try next candidate
              continue;
            }
            final = cachedPath;
            updatedOk = true;
            break;
          }
          if (!updatedOk) { skipped++; continue; }
        }
        if (!final) { skipped++; continue; }
        if (dry) {
          console.log(`[DRY] would update id=${t.id} image='${t.image}' -> '${final}'`);
        } else {
          await prisma.savedListing.update({ where: { id: t.id }, data: { image: final } });
          updated++;
          if ((updated + skipped + errors) % 25 === 0) console.log(`Progress updated=${updated} skipped=${skipped} errors=${errors}`);
        }
      } catch (e) {
        errors++;
        if ((updated + skipped + errors) % 25 === 0) console.log(`Progress updated=${updated} skipped=${skipped} errors=${errors}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  console.log(`Done. Updated=${updated} Skipped=${skipped} Errors=${errors}${dry ? ' (dry run)' : ''}`);
  process.exit(0);
})();
