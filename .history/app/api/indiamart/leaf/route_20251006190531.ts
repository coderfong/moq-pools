import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/indiamart/leaf?key=<leaf-or-subgroup>&page=1&pageSize=40
// SavedListing.categories contains leaf keys (and possibly subgroup keys) from ingestion scripts.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key param required' }, { status: 400 });
  const page = Math.max(1, Number(searchParams.get('page')||'1'));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')||'40')));
  const where = { platform: 'INDIAMART' as any, categories: { has: key } };
  const total = await prisma.savedListing.count({ where });
  const listings = await prisma.savedListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page-1)*pageSize,
    take: pageSize,
    select: { id:true, url:true, title:true, image:true, priceRaw:true, priceMin:true, priceMax:true, currency:true, moq:true, storeName:true, categories:true, terms:true, createdAt:true }
  });
  return NextResponse.json({ key, page, pageSize, total, listings });
}
