import { prisma } from '../src/lib/prisma';
import { getIndiaMartDetailMainImage } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';

/*
Backfill IndiaMART SavedListing.image for rows missing thumbnails.

Usage:
  pnpm ts-node scripts/backfillIndiaMartImages.ts [--limit=200] [--dry=1] [--no-cache=1]

Options:
  --limit       Max rows to process (default 200)
  --dry         Dry run (no DB writes)
  --no-cache    Do not download/cache images; store remote URL instead
*/

function argFlag(name: string): string | undefined {
  const p = process.argv.find(a => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

function parseBool(v: string | undefined, def = false) {
  if (v == null) return def; const s = v.toLowerCase();
  if (/^(1|true|yes|y)$/i.test(s)) return true; if (/^(0|false|no|n)$/i.test(s)) return false; return def;
}

(async () => {
  const limit = Number(argFlag('limit') || '200') || 200;
  const dry = parseBool(argFlag('dry'), false);
  const noCache = parseBool(argFlag('no-cache'), false);

  console.log(`[backfillIndiaMartImages] start limit=${limit} dry=${dry} cache=${!noCache}`);
  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART', OR: [ { image: null }, { image: '' } ] },
    select: { id: true, url: true },
    take: limit
  });
  if (!rows.length) { console.log('No rows missing images.'); return; }
  console.log(`Processing ${rows.length} rows...`);
  let updated = 0, skipped = 0;
  for (const r of rows) {
    try {
      const img = await getIndiaMartDetailMainImage(r.url);
      if (!img) { skipped++; continue; }
      let finalImg = img;
      if (!noCache) {
        try { const { localPath } = await cacheExternalImage(img); finalImg = localPath; } catch {}
      }
      if (dry) {
        console.log(`[dry] would update ${r.id} -> ${finalImg}`);
        continue;
      }
      await prisma.savedListing.update({ where: { id: r.id }, data: { image: finalImg } });
      updated++;
    } catch (e) {
      skipped++;
    }
  }
  console.log(`Done. Updated=${updated} Skipped=${skipped}`);
})();
