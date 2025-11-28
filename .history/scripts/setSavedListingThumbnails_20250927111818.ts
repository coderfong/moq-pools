import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { cacheExternalImage } from '@/lib/imageCache';

/*
CSV format (comma or tab-delimited accepted):
- url,image
Where:
  - url: SavedListing.url to match (unique key)
  - image: either an external URL (http/https) or a local file path relative to project root (or absolute)

Alternatively, provide a JSON file of objects: [{ url, image }]

Flags:
  --file=<path>         Required. CSV or JSON mapping file
  --dry-run=1           Do not write to DB, only report would-be changes
  --limit=<n>           Max rows to process (default: unlimited)
*/

function parseBool(v: any, def = false) {
  if (v == null) return def;
  const s = String(v).trim();
  if (/^(1|true|yes|y)$/i.test(s)) return true;
  if (/^(0|false|no|n)$/i.test(s)) return false;
  return def;
}

function isExternal(src: string) {
  return /^(https?:)?\/\//i.test(src);
}

async function ensureLocalFromPath(pth: string): Promise<string> {
  // Treat leading '/public/..' as workspace-relative, not OS root
  const norm = pth.replace(/^[\\/]+public[\\/]/i, 'public/');
  const abs = path.isAbsolute(norm) ? norm : path.join(process.cwd(), norm);
  // Copy into public/cache with deterministic name
  const fileName = path.basename(abs);
  const destDir = path.join(process.cwd(), 'public', 'cache');
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, fileName);
  const data = await fs.readFile(abs);
  await fs.writeFile(dest, data);
  return `/cache/${fileName}`;
}

async function loadMappings(filePath: string): Promise<Array<{ url: string; image: string }>> {
  const raw = await fs.readFile(filePath, 'utf8');
  if (/\.json$/i.test(filePath)) {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array');
    return arr.map((o) => ({ url: String(o.url || ''), image: String(o.image || '') }))
      .filter(x => x.url && x.image);
  }
  // CSV/TSV
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(/[\t,]/).map(s => s.trim().toLowerCase());
  const urlIdx = header.findIndex(h => h === 'url');
  const imgIdx = header.findIndex(h => h === 'image' || h === 'img' || h === 'thumbnail');
  if (urlIdx < 0 || imgIdx < 0) throw new Error('CSV header must include url and image');
  const out: Array<{ url: string; image: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[\t,]/);
    const url = (cols[urlIdx] || '').trim();
    const image = (cols[imgIdx] || '').trim();
    if (url && image) out.push({ url, image });
  }
  return out;
}

async function main() {
  const argFile = process.argv.find(a => a.startsWith('--file='));
  if (!argFile) {
    console.log('Usage: ts-node scripts/setSavedListingThumbnails.ts --file=scripts/thumbs.csv [--dry-run=1] [--limit=100]');
    process.exit(1);
  }
  const filePath = argFile.split('=')[1];
  const dryRun = parseBool((process.argv.find(a => a.startsWith('--dry-run=')) || '').split('=')[1], false);
  const limitArg = Number((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1]);
  const limit = Number.isFinite(limitArg) ? limitArg : Infinity;

  const mappings = (await loadMappings(filePath)).slice(0, limit);
  if (!mappings.length) {
    console.log('No mappings loaded');
    return;
  }

  const p: any = prisma as any;
  let updated = 0, notFound = 0, errored = 0;
  for (const m of mappings) {
    try {
      const row = await p.savedListing.findUnique({ where: { url: m.url }, select: { id: true } });
      if (!row) { notFound++; continue; }
      let localPath = m.image;
      if (isExternal(m.image)) {
        try {
          const { localPath: lp } = await cacheExternalImage(m.image);
          localPath = lp;
        } catch {
          // fallback: store the external URL if caching fails
        }
      } else {
        // treat as local file path
        localPath = await ensureLocalFromPath(m.image);
      }
      if (dryRun) {
        console.log(`[dry-run] would update ${m.url} -> ${localPath}`);
        continue;
      }
      await p.savedListing.update({ where: { id: row.id }, data: { image: localPath } });
      updated++;
    } catch (e) {
      errored++;
    }
  }
  console.log(`Done. Updated: ${updated}, NotFound: ${notFound}, Errors: ${errored}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
