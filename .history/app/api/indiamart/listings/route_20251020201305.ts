import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INDIAMART_CATEGORIES } from '@/lib/indiamartCategories';

// GET /api/indiamart/listings?category=<slug>&page=1&pageSize=80&recursive=1
// category slug should match SavedListing.categories entries (termToCategorySlug output)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const page = Math.max(1, Number(searchParams.get('page')||'1'));
  // Raise cap to 150 to allow denser browsing sessions (was 100).
  const pageSize = Math.min(150, Math.max(1, Number(searchParams.get('pageSize')||'80')));
  const tax = /^(1|true|yes)$/i.test(String(searchParams.get('tax')||''));
  const recursive = /^(1|true|yes)$/i.test(String(searchParams.get('recursive')||''));
  if (!category) {
    return NextResponse.json({ error: 'category param required' }, { status: 400 });
  }
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const db = prisma;

  // If recursive, gather descendant slugs by checking ExportCategory label hierarchy & applying same slug transform.
  let categories: string[] = [category];
  if (recursive) {
    // naive expansion: find export categories whose parentLabel chain slugifies to target
  const ec = await (db as any).exportCategory.findMany({ select: { label: true, parentLabel: true } }).catch(()=>[]);
    const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const targetParents = new Set<string>();
    for (const r of ec) if (toSlug(r.label) === category) targetParents.add(r.label);
    if (targetParents.size) {
      // BFS downward
      const childrenMap = new Map<string,string[]>();
      for (const r of ec) {
        if (r.parentLabel) {
          if (!childrenMap.has(r.parentLabel)) childrenMap.set(r.parentLabel, []);
          childrenMap.get(r.parentLabel)!.push(r.label);
        }
      }
      const queue = Array.from(targetParents);
      const visitedLabels = new Set(queue);
      while (queue.length) {
        const cur = queue.shift()!;
        for (const kid of childrenMap.get(cur) || []) if (!visitedLabels.has(kid)) { visitedLabels.add(kid); queue.push(kid); }
      }
      const descendantSlugs = Array.from(visitedLabels).map(toSlug);
      categories = Array.from(new Set([...categories, ...descendantSlugs]));
    }
  }
  // Optional taxonomy expansion: if tax=1 interpret category as potential group/subgroup key/slug and include descendant leaves.
  if (tax) {
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const target = category;
    const targetSlug = slugify(target);
    const leafKeys: string[] = [];
    const visit = (node: any) => {
      if (node.leaves) for (const leaf of node.leaves) leafKeys.push(leaf.key);
      if (node.children) for (const c of node.children) visit(c);
    };
    for (const top of INDIAMART_CATEGORIES) {
      const topSlug = slugify(top.label);
      if (topSlug === targetSlug || top.key === target) {
        visit(top);
        continue;
      }
      for (const sub of top.children || []) {
        const subSlug = slugify(sub.label);
        if (subSlug === targetSlug || sub.key === target) {
          visit(sub);
        }
      }
    }
    if (leafKeys.length) {
      categories = Array.from(new Set([...categories, ...leafKeys]));
    }
  }

  const where = { platform: 'INDIAMART' as any, categories: { hasSome: categories } };
  const total = await db.savedListing.count({ where });
  const listings = await db.savedListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page-1)*pageSize,
    take: pageSize,
    select: { id:true, url:true, title:true, image:true, priceRaw:true, priceMin:true, priceMax:true, currency:true, moq:true, storeName:true, categories:true, terms:true, createdAt:true }
  });
  return NextResponse.json({ page, pageSize, total, categories, listings });
}
