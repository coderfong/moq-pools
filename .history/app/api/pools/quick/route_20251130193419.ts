import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ pools: [] }, { status: 503 });
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const take = Math.min(30, Math.max(1, Number(searchParams.get('take') || 12)));
    const db: any = prisma as any;

    const where: any = {
      isActive: true,
      moqQty: { gt: 0 },
      pool: { is: { status: 'OPEN' } },
    };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { supplier: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const items = await db.product.findMany({
      where,
      include: { pool: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    // Collect sourceUrls to batch-fetch SavedListings for image upgrade
    const sourceUrls = items.map((p: any) => p.sourceUrl).filter((u: any) => !!u);
    const savedListingsMap = new Map<string, string>();
    if (sourceUrls.length > 0) {
      const savedListings = await db.savedListing.findMany({
        where: { url: { in: sourceUrls } },
        select: { url: true, image: true }
      });
      for (const sl of savedListings) {
        if (sl.image && /^\/cache\//i.test(sl.image)) {
          savedListingsMap.set(sl.url, sl.image);
        }
      }
    }

    const pools = items
      .filter((p: any) => p.pool)
      .map((p: any) => {
        let img: string | null = null;
        try { img = (JSON.parse(p.imagesJson || '[]') as string[])[0] || null; } catch { img = null; }
        
        // Upgrade /seed/ placeholder to real cached image from SavedListing
        if (img && /^\/seed\//i.test(img) && p.sourceUrl && savedListingsMap.has(p.sourceUrl)) {
          img = savedListingsMap.get(p.sourceUrl)!;
        }
        
        return {
          poolId: p.pool.id as string,
          productId: p.id as string,
          title: p.title as string,
          supplier: p.supplier?.name || null,
          image: img,
          price: p.unitPrice != null ? Number(p.unitPrice as any) : null,
          currency: p.baseCurrency || null,
          progressPct: p.pool ? Math.min(100, Math.round((p.pool.pledgedQty / p.pool.targetQty) * 100)) : 0,
        };
      });

    return NextResponse.json({ pools });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/pools/quick failed', e?.message || e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
