import { prisma } from '../src/lib/prisma';
import { getAlibabaDetailFirstJpg } from '../src/lib/providers/alibaba';
import { cacheExternalImage } from '../src/lib/imageCache';
import { CATEGORIES } from './categories.data';

/*
Usage:
  pnpm ts-node -r tsconfig-paths/register scripts/refreshAlibabaImages.ts [--limit=100] [--only-url=<url>] [--category=<key>] [--sub=<term>] [--all=1] [--per-subs=1]

- For each SavedListing on ALIBABA, re-fetch the product detail and set image to the first JPG under
  the "Product Descriptions from Supplier" section if found.
- Skips rows with null/empty url.
 - If --category and --sub are provided, restrict to rows tagged with that category and sub term.
 - If --per-subs=1, iterate all featured subcategories in scripts/categories.data.ts and process each set.
   Combine with --limit to cap per-sub batch size (default uses internal paging to process all).
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
  const all = /^1|true|yes$/i.test(String(parseArg('all') || ''));
  const whereMissing = /^1|true|yes$/i.test(String(parseArg('where-missing') || ''));
  const concurrencyStr = parseArg('concurrency');
  const concurrency = Math.max(1, Math.min(16, concurrencyStr ? parseInt(concurrencyStr, 10) : 6));
  const category = parseArg('category');
  const sub = parseArg('sub');
  const perSubs = /^1|true|yes$/i.test(String(parseArg('per-subs') || ''));

  const baseWhere: any = { platform: 'ALIBABA' };
  // build specific 'where' later from baseWhere

  let updated = 0, skipped = 0, errors = 0, processed = 0;
  const seen = new Set<string>();

  async function processBatch(batch: Array<{ id: string; url: string | null }>) {
    let idx = 0;
    async function worker() {
      while (idx < batch.length) {
        const i = idx++;
        const r = batch[i];
        try {
          if (seen.has(r.id)) { skipped++; continue; }
          if (!r.url) { skipped++; continue; }
          const img = await getAlibabaDetailFirstJpg(r.url);
          if (!img) { skipped++; continue; }
          let local = '';
          try {
            const { localPath } = await cacheExternalImage(img);
            local = localPath;
          } catch {
            local = img;
          }
          await prisma.savedListing.update({ where: { id: r.id }, data: { image: local }});
          updated++;
          seen.add(r.id);
        } catch {
          errors++;
        }
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, batch.length) }, () => worker());
    await Promise.all(workers);
  }

  async function processAll(where: any) {
    const take: number = Math.max(50, Math.min(500, limit || 500));
    let cursor: string | undefined = undefined;
    for (;;) {
      const rows: Array<{ id: string; url: string | null }> = await prisma.savedListing.findMany({
        where,
        orderBy: { id: 'asc' },
        take,
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        select: { id: true, url: true },
      });
      if (!rows.length) break;
      await processBatch(rows);
      processed += rows.length;
      cursor = rows[rows.length - 1].id;
      console.log(`Processed: ${processed} (Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors})`);
    }
  }

  const where: any = { ...baseWhere };
  if (onlyUrl) where.url = onlyUrl;
  if (whereMissing) where.image = { not: { startsWith: '/cache/' } } as any;
  if (category) where.categories = { has: category } as any;
  if (sub) where.terms = { has: sub } as any;

  if (perSubs) {
    console.log('Running per featured subcategory across all categories...');
    for (const cat of CATEGORIES) {
      if (!Array.isArray(cat.featured) || cat.featured.length === 0) continue;
      for (const s of cat.featured) {
        const subWhere = { ...baseWhere, categories: { has: cat.key }, terms: { has: s } } as any;
        console.log(`\n[${cat.key}] ${s} ...`);
        await processAll(subWhere);
      }
    }
  } else if (all) {
    await processAll(where);
  } else {
    const rows = await prisma.savedListing.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, select: { id: true, url: true } });
    await processBatch(rows);
    processed = rows.length;
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
