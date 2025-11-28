import { prisma } from '@/lib/prisma';
import { CATEGORIES } from './categories.data';

async function main() {
  const p: any = prisma as any;
  const totals: Record<string, number> = {};
  const perSub: Array<{ category: string; sub: string; count: number }> = [];
  // Preload all with categories and terms
  const rows = await p.savedListing.findMany({ select: { id: true, categories: true, terms: true } });
  for (const cat of CATEGORIES) {
    let catTotal = 0;
    for (const sub of cat.featured || []) {
      let count = 0;
      for (const r of rows as Array<{ categories: string[]; terms: string[] }>) {
        const inCat = Array.isArray(r.categories) && r.categories.includes(cat.key);
        const hasTerm = Array.isArray(r.terms) && (r.terms.includes(sub) || r.terms.includes(sub.toLowerCase()));
        if (inCat && hasTerm) count++;
      }
      perSub.push({ category: cat.key, sub, count });
      catTotal += count;
    }
    totals[cat.key] = catTotal;
  }

  // Print
  let grand = 0;
  for (const k of Object.keys(totals)) grand += totals[k];
  console.log(`SavedListing counts by category/subcategory`);
  console.log(`Grand total across featured subs: ${grand}`);
  for (const cat of CATEGORIES) {
    console.log(`\n[${cat.key}] total=${totals[cat.key] || 0}`);
    for (const sub of cat.featured) {
      const row = perSub.find(x => x.category === cat.key && x.sub === sub)!;
      console.log(`  - ${sub}: ${row.count}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
