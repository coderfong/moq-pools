import { prisma } from '../src/lib/prisma';
import { cacheExternalImage } from '../src/lib/imageCache';
import { isBadImageHashFromPath } from '../src/lib/badImages';
import { getIndiaMartDetailImageCandidates } from '../src/lib/providers/indiamart';
import { resolveFallbackImage } from '../src/lib/imageFallbacks';

/*
Normalize all IndiaMART SavedListing images so they are cached local JPGs (like /cache/898fc7f2....jpg).

Logic per listing:
 1. If image missing OR not starting with /cache/ OR is a bad hash OR --force provided:
    a. If current image is external (http) try caching it directly.
    b. Else fetch candidates from detail page and cache first non-bad candidate.
 2. If resulting cached image is still bad hash and --aggressive flag used, iterate remaining candidates.

Usage:
  pnpm ts-node scripts/normalizeIndiaMartImages.ts [--limit=500] [--force=1] [--aggressive=1] [--headless=1] [--dry=1] [--debug=1] [--allow-fallback=1] [--fallback-only=1] [--report=path]

Flags:
  --limit       Max rows (default 500)
  --force       Re-normalize even if existing seems OK
  --aggressive  Iterate multiple candidates until non-bad hash found
  --headless    Allow headless detail candidate enumeration (IM_DETAIL_HEADLESS=1)
  --dry             Dry run (no DB writes)
  --debug / --log-skips  Verbose per-item skip/update logging + reason counters
  --allow-fallback   If no good candidate found, store curated fallback (if available) instead of skipping
  --fallback-only    When set, only perform DB update if a fallback image is applied (ignore normal good candidates)
  --report=path      Write JSON summary (counts + sample IDs) to given file path

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
  const debug = flag('debug', flag('log-skips', false));
  const allowFallback = flag('allow-fallback', false);
  const fallbackOnly = flag('fallback-only', false);
  const reportPath = arg('report');
  if (headless) process.env.IM_DETAIL_HEADLESS = '1';
  console.log(`[normalizeIndiaMartImages] start limit=${limit} force=${force} aggressive=${aggressive} headless=${headless} dry=${dry} debug=${debug} allowFallback=${allowFallback} fallbackOnly=${fallbackOnly} reportPath=${reportPath||''}`);

  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' },
    select: { id: true, url: true, image: true, title: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  if (!rows.length) { console.log('No rows.'); return; }
  console.log(`Fetched ${rows.length} listings`);

  let updated = 0, skipped = 0, errors = 0;
  const reasons: Record<string, number> = {};
  const note = (r: string) => { reasons[r] = (reasons[r] || 0) + 1; };
  const samples: Record<string,string[]> = {};
  const sample = (k: string, id: string) => { (samples[k] ||= []).length < 25 && samples[k].push(id); };
  for (const r of rows) {
    try {
      const img = r.image || '';
      const needs = force || !img || !img.startsWith('/cache/') || isBadImageHashFromPath(img);
  if (!needs) { skipped++; note('already_good'); sample('already_good', r.id); if (debug) console.log(`[SKIP already_good] ${r.id}`); continue; }
      let final: string | null = null;
      let usedFallback = false; // track if this row applied a curated fallback
      // If existing image is external and not in cache path, attempt to cache it first
      if (/^https?:/i.test(img)) {
        try { const { localPath } = await cacheExternalImage(img, { preferJpgForIndiaMart: true }); final = localPath; if (debug) console.log(`[CACHE existing external] ${r.id} -> ${final}`); } catch { if (debug) console.log(`[WARN cache_fail] ${r.id}`); }
      }
      // If still missing or bad, enumerate detail candidates
      if (!final || isBadImageHashFromPath(final)) {
  if (!r.url) { skipped++; note('no_url'); sample('no_url', r.id); if (debug) console.log(`[SKIP no_url] ${r.id}`); continue; }
      // Enhanced candidates: includes og/twitter/ld+json and filters blocked icons; ranked by size/JPEG preference
      const candidates = await getIndiaMartDetailImageCandidates(r.url);
  if (!candidates.length) { note('no_candidates'); sample('no_candidates', r.id); if (debug) console.log(`[SKIP no_candidates] ${r.id}`); }
        const tryList = aggressive ? candidates : (candidates[0] ? [candidates[0]] : []);
        for (const cand of tryList) {
          try {
            const { localPath } = await cacheExternalImage(cand, { preferJpgForIndiaMart: true }); // unified to JPG
            final = localPath;
            if (debug) console.log(`[CAND] ${r.id} cand=${cand} -> ${final}${isBadImageHashFromPath(final) ? ' (bad-hash)' : ''}`);
            if (!isBadImageHashFromPath(final)) break; // accept good
          } catch { if (debug) console.log(`[WARN cand_fail] ${r.id} cand=${cand}`); }
        }
      }
      // Fallback injection if allowed and still no good final
      if ((!final || isBadImageHashFromPath(final)) && allowFallback) {
        const fallback = resolveFallbackImage(final, r.title || '', '');
        if (fallback && !isBadImageHashFromPath(fallback)) {
          final = fallback;
          usedFallback = true;
          note('fallback_applied'); sample('fallback_applied', r.id);
          if (debug) console.log(`[FALLBACK applied] ${r.id} -> ${final}`);
        } else {
          if (debug) console.log(`[FALLBACK none] ${r.id}`);
        }
      }
  if (!final) { skipped++; if (!(reasons['no_candidates'] && !reasons['no_final'])) note('no_final'); sample('no_final', r.id); continue; }
  if (isBadImageHashFromPath(final) && !force) { skipped++; note('only_bad_candidates'); sample('only_bad_candidates', r.id); continue; }
  if (fallbackOnly && !usedFallback) { skipped++; note('not_fallback'); sample('not_fallback', r.id); if (debug) console.log(`[SKIP not_fallback] ${r.id}`); continue; }
      if (dry) {
        note(isBadImageHashFromPath(final) ? 'dry_bad' : 'dry_good'); sample(isBadImageHashFromPath(final) ? 'dry_bad' : 'dry_good', r.id);
        if (debug) console.log(`[DRY] ${r.id} -> ${final}`);
      } else {
        await prisma.savedListing.update({ where: { id: r.id }, data: { image: final } });
        updated++;
        note(isBadImageHashFromPath(final) ? 'updated_bad' : 'updated_good'); sample(isBadImageHashFromPath(final) ? 'updated_bad' : 'updated_good', r.id);
        if (debug) console.log(`[UPDATED] ${r.id} -> ${final}`);
      }
    } catch (e) {
      errors++;
      note('error'); sample('error', r.id);
      if (debug) console.log(`[ERROR] ${r.id} ${(e as any)?.message || e}`);
    }
  }
  console.log(`Done. Updated=${updated} Skipped=${skipped} Errors=${errors}${dry ? ' (dry)' : ''}`);
  console.log('Reason counts:', reasons);
  if (reportPath) {
    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, JSON.stringify({ counts: reasons, updated, skipped, errors, samples }, null, 2));
    console.log(`[report] wrote ${reportPath}`);
  }
})();
