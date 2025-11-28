import { prisma } from '@/lib/prisma';
import { getAlibabaDetailFirstJpg } from '@/lib/providers/alibaba';

async function main() {
  const take = Number(process.env.TAKE || 5);
  const where: any = { platform: 'ALIBABA' };
  const cat = process.env.CAT;
  const term = process.env.TERM;
  if (cat) where.categories = { has: cat };
  if (term) where.terms = { has: term };
  const rows = await prisma.savedListing.findMany({
    where,
    select: { id: true, url: true, title: true },
    orderBy: { updatedAt: 'desc' },
    take,
  });
  console.log(`Testing ${rows.length} listings...`);
  let ok = 0, empty = 0, errs = 0;
  for (const r of rows) {
    try {
      const img = await getAlibabaDetailFirstJpg(r.url);
      if (img) { ok++; console.log('OK', r.id, img); }
      else { empty++; console.log('EMPTY', r.id, r.url); }
    } catch (e) {
      errs++; console.log('ERR', r.id, r.url, (e as Error).message);
    }
  }
  console.log({ ok, empty, errs });
}

main().catch((e) => { console.error(e); process.exit(1); });
