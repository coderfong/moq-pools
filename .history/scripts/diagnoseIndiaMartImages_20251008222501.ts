#!/usr/bin/env ts-node
import { prisma } from '../src/lib/prisma';

/*
Quick diagnostic: counts of IndiaMART SavedListing.image states.
Usage:
  pnpm ts-node scripts/diagnoseIndiaMartImages.ts
  PNPM_CMD="cross-env TS_NODE_PROJECT=tsconfig.scripts.json node -r ts-node/register -r tsconfig-paths/register" # already in scripts
*/

function bucket(img: string | null | undefined) {
  if (!img) return 'missing';
  if (img.startsWith('/seed/')) return 'seed';
  if (img.startsWith('/cache/')) return 'cached';
  if (/^https?:\/\//i.test(img)) return 'remote';
  return 'other';
}

async function main() {
  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' as any },
    select: { id: true, image: true },
    take: 5000,
  });
  const counts: Record<string, number> = { missing:0, seed:0, cached:0, remote:0, other:0 };
  for (const r of rows) counts[bucket(r.image)]++;
  const total = rows.length || 1;
  const pct = (n: number) => ((n/total)*100).toFixed(1)+'%';
  console.log(`[diagnoseIndiaMartImages] rows=${total}`);
  for (const k of Object.keys(counts)) {
    console.log(`  ${k.padEnd(8)} ${String(counts[k]).padStart(5)} (${pct(counts[k])})`);
  }
  // High-value actionable suggestions
  if (counts.seed + counts.missing > 0) {
    console.log(`\nSuggestion: run backfill for ~${Math.min(300, counts.seed + counts.missing)} more rows:`);
    console.log('  pnpm ts-node scripts/backfillIndiaMartImages.ts --limit=300 --include-seed=1 --verbose=1');
  }
  if (counts.remote > 0) {
    console.log('\nSome listings still hotlink remote images; you can proactively cache them:');
    console.log('  (Add logic or re-run ingestion with --cache-images=1)');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
