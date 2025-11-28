import { prisma } from '@/lib/prisma';
import { cacheExternalImage } from '@/lib/imageCache';

function isExternal(src?: string | null) {
  if (!src) return false;
  const s = String(src);
  return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//');
}

async function run(limit = 1000) {
  const p: any = prisma as any;
  const rows = await p.savedListing.findMany({
    where: { image: { not: null } },
    select: { id: true, image: true },
    take: limit,
  });
  let updated = 0;
  for (const r of rows as Array<{ id: string; image: string | null }>) {
    if (!isExternal(r.image)) continue;
    try {
      const { localPath } = await cacheExternalImage(r.image!);
      await p.savedListing.update({ where: { id: r.id }, data: { image: localPath } });
      updated++;
    } catch (e) {
      // continue
    }
  }
  console.log(`Cached images for ${updated} listings (scanned ${rows.length})`);
}

(async () => {
  const arg = process.argv.find(a => /^--limit=/.test(a));
  const limit = arg ? Number(arg.split('=')[1]) : undefined;
  await run(Number.isFinite(limit) && (limit as number) > 0 ? (limit as number) : 2000);
  process.exit(0);
})();
