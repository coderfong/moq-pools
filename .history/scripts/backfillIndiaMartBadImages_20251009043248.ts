#!/usr/bin/env ts-node
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
import { getIndiaMartDetailMainImage } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';

interface Args { limit: number; dryRun: boolean; concurrency: number; }
function parseArgs(argv: string[]): Args {
  const out: Args = { limit: 500, dryRun: false, concurrency: 4 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, raw] = a.includes('=') ? a.split(/=(.*)/) : [a, argv[i + 1]];
    const take = () => { if (!a.includes('=')) i++; return raw; };
    switch (k) {
      case '--limit': out.limit = Math.max(1, Math.min(5000, Number(take()) || out.limit)); break;
      case '--dry-run': out.dryRun = /^(1|true|yes)$/i.test(String(take())); break;
      case '--concurrency': out.concurrency = Math.max(1, Math.min(16, Number(take()) || out.concurrency)); break;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();
  console.log(`[BackfillIMBadImages] Start limit=${args.limit} dryRun=${args.dryRun} concurrency=${args.concurrency}`);
  const candidates = await prisma.savedListing.findMany({
    where: {
      platform: SourcePlatform.INDIAMART,
      image: { startsWith: '/cache/' }
    },
    select: { id: true, url: true, image: true },
    take: args.limit * 2 // over-fetch then filter client-side
  });
  const badOnes = candidates.filter(c => c.image && isBadImageHashFromPath(c.image));
  console.log(`[BackfillIMBadImages] Fetched=${candidates.length} badHashMatches=${badOnes.length}`);
  const target = badOnes.slice(0, args.limit);
  let improved = 0; let skipped = 0; let failures = 0;
  let idx = 0;
  async function worker() {
    while (idx < target.length) {
      const i = idx++;
      const row = target[i];
      try {
        const detailBest = await getIndiaMartDetailMainImage(row.url);
        if (!detailBest) { skipped++; continue; }
        // Skip if still same bad hash
        if (isBadImageHashFromPath(detailBest)) { skipped++; continue; }
        const cached = await cacheExternalImage(detailBest, { preferJpgForIndiaMart: true });
        if (!cached?.localPath || isBadImageHashFromPath(cached.localPath)) { skipped++; continue; }
        if (!args.dryRun) {
          await prisma.savedListing.update({ where: { id: row.id }, data: { image: cached.localPath } });
        }
        improved++;
        console.log(`[improved] id=${row.id} ${row.image} -> ${cached.localPath}`);
      } catch (e:any) {
        failures++;
        if (failures < 10) console.warn('[error]', row.id, e?.message || e);
      }
    }
  }
  const workers = Array.from({ length: Math.min(args.concurrency, target.length) }, () => worker());
  await Promise.all(workers);
  console.log(`[BackfillIMBadImages] Done improved=${improved} skipped=${skipped} failures=${failures}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
