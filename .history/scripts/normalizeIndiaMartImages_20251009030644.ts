import { prisma } from '../src/lib/prisma';
import { cacheExternalImage } from '../src/lib/imageCache';
import { isBadImageHashFromPath } from '../src/lib/badImages';
import { getIndiaMartDetailImageCandidates } from '../src/lib/providers/indiamart';

/*
Normalize all IndiaMART SavedListing images so they are cached local JPGs (like /cache/898fc7f2....jpg).

Logic per listing:
 1. If image missing OR not starting with /cache/ OR is a bad hash OR --force provided:
    a. If current image is external (http) try caching it directly.
    b. Else fetch candidates from detail page and cache first non-bad candidate.
 2. If resulting cached image is still bad hash and --aggressive flag used, iterate remaining candidates.

Usage:
  pnpm ts-node scripts/normalizeIndiaMartImages.ts [--limit=500] [--force=1] [--aggressive=1] [--headless=1] [--dry=1]

Flags:
  --limit       Max rows (default 500)
  --force       Re-normalize even if existing seems OK
  --aggressive  Iterate multiple candidates until non-bad hash found
  --headless    Allow headless detail candidate enumeration (IM_DETAIL_HEADLESS=1)
  --dry         Dry run (no DB writes)

Exit codes: 0 success, non-zero on fatal error.
*/

function arg(name: string): string | undefined {
  const eq = `--${name}=`;
  const direct = process.argv.find(a => a.startsWith(eq));
  if (direct) return direct.slice(eq.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith('--')) return next;
    return 'true';
  }
  return undefined;
}
function flag(name: string, def = false) { const v = arg(name); if (v == null) return def; return /^(1|true|yes|on)$/i.test(v); }

(async () => {
  const limit = parseInt(arg('limit') || '500', 10);
  const force = flag('force', false);
  const headless = flag('headless', false);
  const aggressive = flag('aggressive', false);
  const dry = flag('dry', false);
  if (headless) process.env.IM_DETAIL_HEADLESS = '1';
  console.log(`[normalizeIndiaMartImages] start limit=${limit} force=${force} aggressive=${aggressive} headless=${headless} dry=${dry}`);

  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' },
    select: { id: true, url: true, image: true, title: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  if (!rows.length) { console.log('No rows.'); return; }
  console.log(`Fetched ${rows.length} listings`);

  let updated = 0, skipped = 0, errors = 0;
  for (const r of rows) {
    try {
      const img = r.image || '';
      const needs = force || !img || !img.startsWith('/cache/') || isBadImageHashFromPath(img);
      if (!needs) { skipped++; continue; }
      let final: string | null = null;
      // If existing image is external and not in cache path, attempt to cache it first
      if (/^https?:/i.test(img)) {
        try { const { localPath } = await cacheExternalImage(img, { preferJpgForIndiaMart: true }); final = localPath; } catch {}
      }
      // If still missing or bad, enumerate detail candidates
      if (!final || isBadImageHashFromPath(final)) {
        if (!r.url) { skipped++; continue; }
        const candidates = await getIndiaMartDetailImageCandidates(r.url);
        if (!candidates.length) { skipped++; continue; }
        const tryList = aggressive ? candidates : [candidates[0]];
        for (const cand of tryList) {
          try {
            const { localPath } = await cacheExternalImage(cand, { preferJpgForIndiaMart: true });
            final = localPath;
            if (!isBadImageHashFromPath(final)) break; // accept good
          } catch {}
        }
      }
      if (!final || (isBadImageHashFromPath(final) && !force)) { skipped++; continue; }
      if (dry) {
        console.log(`[DRY] ${r.id} -> ${final}`);
      } else {
        await prisma.savedListing.update({ where: { id: r.id }, data: { image: final } });
        updated++;
      }
    } catch (e) {
      errors++;
    }
  }
  console.log(`Done. Updated=${updated} Skipped=${skipped} Errors=${errors}${dry ? ' (dry)' : ''}`);
})();
