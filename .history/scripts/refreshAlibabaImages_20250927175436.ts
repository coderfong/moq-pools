import { prisma } from '../src/lib/prisma';
import { getAlibabaDetailFirstJpg } from '../src/lib/providers/alibaba';

/*
Usage:
  pnpm ts-node -r tsconfig-paths/register scripts/refreshAlibabaImages.ts [--limit=100] [--only-url=<url>]

- For each SavedListing on ALIBABA, re-fetch the product detail and set image to the first JPG under
  the "Product Descriptions from Supplier" section if found.
- Skips rows with null/empty url.
*/

function parseArg(name: string): string | undefined {
  const pref = `--${name}=`;
  const a = process.argv.find(x => x.startsWith(pref));
  return a ? a.slice(pref.length) : undefined;
}

async function main() {
  const onlyUrl = parseArg('only-url');
  const limitStr = parseArg('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 200;

  const where: any = { platform: 'ALIBABA' };
  if (onlyUrl) where.url = onlyUrl;

  const rows = await prisma.savedListing.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, select: { id: true, url: true } });
  let updated = 0, skipped = 0, errors = 0;

  for (const r of rows) {
    try {
      if (!r.url) { skipped++; continue; }
      const img = await getAlibabaDetailFirstJpg(r.url);
      if (!img) { skipped++; continue; }
      await prisma.savedListing.update({ where: { id: r.id }, data: { image: img }});
      updated++;
      // optional tiny delay
      await new Promise(res => setTimeout(res, 80));
    } catch (e) {
      errors++;
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
