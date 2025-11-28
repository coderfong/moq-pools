import { prisma } from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { cacheExternalImage } from '../src/lib/imageCache';

/*
Convert existing cached IndiaMART images (PNG/WEBP) to JPG for uniformity.

Logic:
 1. Find SavedListing rows platform=INDIAMART with image like /cache/<hash>.png|webp
 2. For each, reconstruct original file on disk: public/cache/<hash>.<ext>
 3. Read bytes and re-feed through cacheExternalImage with preferJpgForIndiaMart forcing JPG output.
 4. Update DB path if changed (.jpg) and optionally delete old .png/.webp file.

Usage:
  pnpm ts-node scripts/convertIndiaMartImagesToJpg.ts [--limit=400] [--dry=1] [--keep-old=1]
*/

function arg(name: string): string | undefined { const p = `--${name}=`; return process.argv.find(a => a.startsWith(p))?.slice(p.length); }
function flag(name: string, def=false) { const v = arg(name); if (v == null) return def; return /^(1|true|yes)$/i.test(v); }

(async () => {
  const limit = parseInt(arg('limit') || '400', 10);
  const dry = flag('dry', false);
  const keepOld = flag('keep-old', false);
  const debug = flag('debug', false);
  console.log(`[convertIndiaMartImagesToJpg] start limit=${limit} dry=${dry} keepOld=${keepOld} debug=${debug}`);

  // Grab candidate rows
  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART', image: { not: null } },
    select: { id: true, image: true },
    take: limit * 2
  });
  const targets = rows.filter(r => /\/cache\/[a-f0-9]{40}\.(png|webp)$/i.test(r.image || '')).slice(0, limit);
  if (!targets.length) { console.log('No PNG/WEBP cached IndiaMART images found.'); return; }
  console.log(`Processing ${targets.length} images...`);

  let converted = 0, skipped = 0, errors = 0;
  let skipNoSharp = 0, skipMissingFile = 0, skipBadExt = 0;

  // Load sharp once up-front so we can fail fast with a clear message.
  let sharp: any = null;
  try {
    const req: any = (0, eval)('require');
    sharp = req('sharp');
  } catch {}
  if (!sharp) {
    console.warn('[convertIndiaMartImagesToJpg] sharp not available – no conversions performed. Run: pnpm approve-builds sharp && pnpm rebuild sharp');
  }
  for (const r of targets) {
    try {
      if (!r.image) { skipped++; continue; }
      const rel = r.image.replace(/^\/cache\//,'');
      const ext = rel.split('.').pop() || '';
      if (!/(png|webp)/i.test(ext)) { skipped++; skipBadExt++; if (debug) console.log(`SKIP_BAD_EXT id=${r.id} image=${r.image}`); continue; }
      const hash = rel.slice(0, rel.lastIndexOf('.'));
      const absOld = path.join(process.cwd(), 'public', 'cache', `${hash}.${ext}`);
      let exists = true;
      try { await fs.access(absOld); } catch { exists = false; }
      if (!exists) { skipped++; skipMissingFile++; if (debug) console.log(`SKIP_MISSING_FILE id=${r.id} path=${absOld}`); continue; }
      if (!sharp) { skipped++; skipNoSharp++; if (debug) console.log(`SKIP_NO_SHARP id=${r.id}`); continue; }
      const buf = await fs.readFile(absOld);
      const outJpg = path.join(process.cwd(), 'public', 'cache', `${hash}.jpg`);
      try {
        await sharp(buf).flatten({ background: { r:255,g:255,b:255 }}).jpeg({ quality: 82 }).toFile(outJpg);
      } catch (e) { errors++; continue; }
      if (!dry) {
        await prisma.savedListing.update({ where: { id: r.id }, data: { image: `/cache/${hash}.jpg` } });
      }
      if (!keepOld) {
        try { await fs.unlink(absOld); } catch {}
      }
      converted++;
      if ((converted + skipped + errors) % 25 === 0) console.log(`Progress converted=${converted} skipped=${skipped} errors=${errors}`);
    } catch (e) {
      errors++;
    }
  }
  console.log(`Done. Converted=${converted} Skipped=${skipped} Errors=${errors}`);
  if (debug) {
    console.log(`Skip breakdown: noSharp=${skipNoSharp} missingFile=${skipMissingFile} badExt=${skipBadExt}`);
  }
})();
