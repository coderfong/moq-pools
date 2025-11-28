import { prisma } from '../src/lib/prisma';
import { getIndiaMartDetailMainImage } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';
import * as fs from 'fs';
import * as path from 'path';

/*
Backfill IndiaMART SavedListing.image for rows missing thumbnails.

Usage:
  pnpm ts-node scripts/backfillIndiaMartImages.ts [--limit=200] [--dry=1] [--no-cache=1] [--verbose=1] [--dump-miss=5]

Options:
  --limit       Max rows to process (default 200)
  --dry         Dry run (no DB writes)
  --no-cache    Do not download/cache images; store remote URL instead
  --verbose     Log each processed row with outcome
  --dump-miss   Save raw HTML for first N misses to ./tmp/im-miss/<id>.html
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
  const dumpMiss = Number(argFlag('dump-miss') || '0') || 0;
  const includeSeed = parseBool(argFlag('include-seed'), true);

  console.log(`[backfillIndiaMartImages] start limit=${limit} dry=${dry} cache=${!noCache} verbose=${verbose} includeSeed=${includeSeed}`);
  // Fetch extra to allow filtering out only those with placeholder /seed/ images
  const raw = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' },
    select: { id: true, url: true, image: true },
    take: limit * 3
  });
  const rows = raw.filter(r => !r.image || r.image === '' || (includeSeed && r.image.startsWith('/seed/'))).slice(0, limit);
  if (!rows.length) { console.log('No rows missing images.'); return; }
  console.log(`Processing ${rows.length} rows...`);
  let updated = 0, skipped = 0;
  for (const r of rows) {
    try {
      const t0 = Date.now();
      const img = await getIndiaMartDetailMainImage(r.url);
      const dur = Date.now() - t0;
      if (!img) {
        if (dumpMiss > 0) {
          try {
            const resp = await fetch(r.url, { cache: 'no-store' });
            if (resp.ok) {
              const htmlRaw = await resp.text();
              const outDir = path.join(process.cwd(), 'tmp', 'im-miss');
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
              const file = path.join(outDir, `${r.id}.html`);
              fs.writeFileSync(file, htmlRaw, 'utf8');
              if (verbose) console.log(`MISS_DUMP ${r.id} saved=${file} len=${htmlRaw.length}`);
            }
          } catch {}
        }
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
