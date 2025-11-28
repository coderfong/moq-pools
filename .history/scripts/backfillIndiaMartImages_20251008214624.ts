import { prisma } from '../src/lib/prisma';
import { getIndiaMartDetailMainImage } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';

/*
Backfill IndiaMART SavedListing.image for rows missing thumbnails.

Usage:
  pnpm ts-node scripts/backfillIndiaMartImages.ts [--limit=200] [--dry=1] [--no-cache=1] [--verbose=1]

Options:
  --limit       Max rows to process (default 200)
  --dry         Dry run (no DB writes)
  --no-cache    Do not download/cache images; store remote URL instead
  --verbose     Log each processed row with outcome
*/

function argFlag(name: string): string | undefined {
  // Prefer the LAST occurrence so user overrides baked-in script defaults.
  const matches = process.argv.filter(a => a.startsWith(`--${name}=`));
  if (!matches.length) return undefined;
  return matches[matches.length - 1].split('=')[1];
}

function parseBool(v: string | undefined, def = false) {
  if (v == null) return def; const s = v.toLowerCase();
  if (/^(1|true|yes|y)$/i.test(s)) return true; if (/^(0|false|no|n)$/i.test(s)) return false; return def;
}

(async () => {
  const limit = Number(argFlag('limit') || '200') || 200;
  const dry = parseBool(argFlag('dry'), false);
  const noCache = parseBool(argFlag('no-cache'), false);
  const verbose = parseBool(argFlag('verbose'), false);

  console.log(`[backfillIndiaMartImages] start limit=${limit} dry=${dry} cache=${!noCache} verbose=${verbose}`);
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
      const t0 = Date.now();
      const img = await getIndiaMartDetailMainImage(r.url);
      const dur = Date.now() - t0;
      if (!img) {
        if (verbose) console.log(`MISS ${r.id} url=${r.url} durMs=${dur}`);
        skipped++; continue; }
      let finalImg = img;
      if (!noCache) {
        try { const { localPath } = await cacheExternalImage(img); finalImg = localPath; } catch {}
      }
      if (dry) {
        console.log(`[dry] UPDATE ${r.id} url=${r.url} durMs=${dur} -> ${finalImg}`);
        continue;
      }
      await prisma.savedListing.update({ where: { id: r.id }, data: { image: finalImg } });
      if (verbose) console.log(`UPDATE ${r.id} url=${r.url} durMs=${dur} -> ${finalImg}`);
      updated++;
    } catch (e) {
      if (verbose) console.log(`ERROR ${r.id} url=${r.url} ${(e as any)?.message || e}`);
      skipped++;
    }
  }
  console.log(`Done. Updated=${updated} Skipped=${skipped}`);
})();
