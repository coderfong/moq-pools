import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(24, Math.max(1, Number(searchParams.get('limit') || '12')));
  if (!prisma) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const where: any = {
    isActive: true,
    moqQty: { gt: 0 },
    sourcePlatform: { in: ['ALIBABA','C1688','MADE_IN_CHINA','INDIAMART'] as any },
    NOT: [{ sourceUrl: null }],
  };
  if (q) {
    where.OR = [
      { title:       { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { supplier:    { name: { contains: q, mode: 'insensitive' } } as any },
    ];
  }

  try {
    const items = await prisma.product.findMany({
      where,
      include: { pool: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // overfetch, we'll sort by progress next
    });

    // Near‑MOQ first
    const sorted = items.sort((a: any, b: any) => {
      const ap = a.pool ? a.pool.pledgedQty / a.pool.targetQty : 0;
      const bp = b.pool ? b.pool.pledgedQty / b.pool.targetQty : 0;
      return bp - ap;
    }).slice(0, limit);

    const payload = sorted.map((p: any) => {
      let imgs: string[] = [];
      try { imgs = JSON.parse(p.imagesJson || '[]'); } catch {}
      return {
        id: p.id,
        title: p.title,
        description: p.description || '',
        image: imgs?.[0] || '',
        unitPrice: p.unitPrice,
        currency: p.baseCurrency,
        moqQty: p.moqQty,
        sourcePlatform: p.sourcePlatform,
        sourceUrl: p.sourceUrl,
        supplierName: p.supplier?.name || '',
        pool: p.pool ? {
          id: p.pool.id,
          pledgedQty: p.pool.pledgedQty,
          targetQty: p.pool.targetQty,
        } : null,
      };
    });

    return NextResponse.json({ items: payload }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=120' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
