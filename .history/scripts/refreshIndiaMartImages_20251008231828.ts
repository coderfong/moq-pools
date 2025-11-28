import { prisma } from '../src/lib/prisma';
import { getIndiaMartDetailMainImage } from '../src/lib/providers/indiamart';
import { cacheExternalImage } from '../src/lib/imageCache';

/*
Refresh / upgrade IndiaMART SavedListing images.

Usage:
  pnpm ts-node scripts/refreshIndiaMartImages.ts [--limit=300] [--where-missing=1] [--force=1] [--headless=1] [--concurrency=6]

Modes:
  --where-missing=1  Only rows whose image is null/empty or still a /seed/ placeholder OR not in /cache/
  --force=1          Ignore existing cached images and re-fetch detail (use sparingly)
  --headless=1       Allow headless detail page fallback (Playwright) via IM_DETAIL_HEADLESS=1
  --limit=NUM        Max rows to consider (default 300)
  --concurrency=NUM  Parallel detail fetch workers (default 6)

Heuristics to re-upgrade low-quality images even if cached:
  - Cached file extension is .png (often low-res / transparent placeholder) and force not provided
  - Image path contains 'logo', 'icon', 'thumb'
*/

function arg(name: string): string | undefined { const p = `--${name}=`; return process.argv.find(a => a.startsWith(p))?.slice(p.length); }
function flag(name: string, def = false) { const v = arg(name); if (v == null) return def; return /^(1|true|yes)$/i.test(v); }

(async () => {
  const limit = parseInt(arg('limit') || '300', 10);
  const whereMissing = flag('where-missing', false);
  const force = flag('force', false);
  const headless = flag('headless', false);
  const concurrency = Math.max(1, Math.min(16, parseInt(arg('concurrency') || '6', 10)));
  if (headless) process.env.IM_DETAIL_HEADLESS = '1';
  console.log(`[refreshIndiaMartImages] start limit=${limit} whereMissing=${whereMissing} force=${force} headless=${headless} concurrency=${concurrency}`);

  const baseWhere: any = { platform: 'INDIAMART' };
  if (whereMissing) {
    baseWhere.OR = [
      { image: null },
      { image: '' },
      { image: { startsWith: '/seed/' } },
      { image: { not: { startsWith: '/cache/' } } },
    ];
  }
  const rows: Array<{ id: string; url: string | null; image: string | null }> = await prisma.savedListing.findMany({
    where: baseWhere,
    select: { id: true, url: true, image: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  if (!rows.length) { console.log('No rows to process.'); return; }
  console.log(`Fetched ${rows.length} candidate rows`);

  const needUpgrade = (img: string | null | undefined): boolean => {
    if (!img) return true;
    if (img.startsWith('/seed/')) return true;
    if (!img.startsWith('/cache/')) return true;
    if (/logo|icon|thumb/i.test(img)) return true;
    if (/\.png$/i.test(img)) return true; // prefer jpeg/webp re-fetch
    return false;
  };

  const targets = force ? rows : rows.filter(r => needUpgrade(r.image));
  console.log(`Processing ${targets.length} rows (force=${force})`);

  let idx = 0; let updated = 0; let skipped = 0; let errors = 0;
  async function worker() {
    while (idx < targets.length) {
      const i = idx++;
      const r = targets[i];
      if (!r.url) { skipped++; continue; }
      try {
        const img = await getIndiaMartDetailMainImage(r.url);
        if (!img) { skipped++; continue; }
  let final = img;
  try { const { localPath } = await cacheExternalImage(img, { preferJpgForIndiaMart: true }); final = localPath; } catch {}
        await prisma.savedListing.update({ where: { id: r.id }, data: { image: final } });
        updated++;
        if ((updated + skipped + errors) % 25 === 0) console.log(`Progress: updated=${updated} skipped=${skipped} errors=${errors}`);
      } catch (e) {
        errors++;
        if ((updated + skipped + errors) % 25 === 0) console.log(`Progress: updated=${updated} skipped=${skipped} errors=${errors}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  console.log(`Done. Updated=${updated} Skipped=${skipped} Errors=${errors}`);
})();
