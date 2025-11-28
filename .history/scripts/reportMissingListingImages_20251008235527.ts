import { prisma } from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

/*
Report SavedListing rows whose image points at /cache/<hash>.ext but file is missing.

Usage:
  pnpm ts-node scripts/reportMissingListingImages.ts [--platform=INDIAMART] [--limit=500] [--ext=jpg,png,webp]

Outputs a table + summary counts and (optional) JSON lines with --json=1.
*/

function arg(name: string): string | undefined { const p = `--${name}=`; return process.argv.find(a => a.startsWith(p))?.slice(p.length); }
function flag(name: string, def=false) { const v = arg(name); if (v == null) return def; return /^(1|true|yes)$/i.test(v); }

(async () => {
  const platform = arg('platform') || 'INDIAMART';
  const limit = parseInt(arg('limit') || '500', 10);
  const json = flag('json', false);
  const extFilter = (arg('ext') || 'jpg,png,webp').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  console.log(`[reportMissingListingImages] platform=${platform} limit=${limit} exts=${extFilter.join(',')} json=${json}`);

  const rows = await prisma.savedListing.findMany({
    where: { platform, image: { startsWith: '/cache/' } },
    select: { id: true, image: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  if (!rows.length) { console.log('No rows.'); return; }

  const results: Array<{ id: string; image: string; exists: boolean } > = [];
  for (const r of rows) {
    if (!r.image) continue;
    const m = r.image.match(/^\/cache\/([a-f0-9]{40})\.(\w{2,5})$/i);
    if (!m) continue;
    const [ , hash, ext ] = m;
    if (!extFilter.includes(ext.toLowerCase())) continue;
    const abs = path.join(process.cwd(), 'public', 'cache', `${hash}.${ext}`);
    let exists = true;
    try { await fs.access(abs); } catch { exists = false; }
    if (!exists) results.push({ id: r.id, image: r.image, exists });
  }

  console.log(`Missing files: ${results.length}`);
  if (!results.length) return;
  if (json) {
    for (const r of results) console.log(JSON.stringify(r));
  } else {
    for (const r of results.slice(0, 50)) {
      console.log(`${r.id}\t${r.image}`);
    }
    if (results.length > 50) console.log(`... (${results.length - 50} more omitted)`);
  }
})();
