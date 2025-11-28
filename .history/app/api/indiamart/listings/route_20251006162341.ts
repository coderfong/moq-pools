import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/indiamart/listings?category=<slug>&page=1&pageSize=40&recursive=1
// category slug should match SavedListing.categories entries (termToCategorySlug output)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const page = Math.max(1, Number(searchParams.get('page')||'1'));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')||'40')));
  const recursive = /^(1|true|yes)$/i.test(String(searchParams.get('recursive')||''));
  if (!category) {
    return NextResponse.json({ error: 'category param required' }, { status: 400 });
  }

  // If recursive, gather descendant slugs by checking ExportCategory label hierarchy & applying same slug transform.
  let categories: string[] = [category];
  if (recursive) {
    // naive expansion: find export categories whose parentLabel chain slugifies to target
    const ec = await (prisma as any).exportCategory.findMany({ select: { label: true, parentLabel: true } }).catch(()=>[]);
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

  const where = { platform: 'INDIAMART' as any, categories: { hasSome: categories } };
  const total = await prisma.savedListing.count({ where });
  const listings = await prisma.savedListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page-1)*pageSize,
    take: pageSize,
    select: { id:true, url:true, title:true, image:true, priceRaw:true, priceMin:true, priceMax:true, currency:true, moq:true, storeName:true, categories:true, terms:true, createdAt:true }
  });
  return NextResponse.json({ page, pageSize, total, categories, listings });
}
