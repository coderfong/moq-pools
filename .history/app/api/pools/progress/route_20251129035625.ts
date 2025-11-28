import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedListingId = searchParams.get('savedListingId');

    console.log('[Pool Progress API] Request for:', savedListingId);

    if (!savedListingId) {
      return NextResponse.json({ error: 'savedListingId required' }, { status: 400 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find the saved listing
    const savedListing = await (prisma as any).savedListing.findUnique({
      where: { id: savedListingId },
      select: { url: true }
    });

    console.log('[Pool Progress API] Found listing:', !!savedListing);

    if (!savedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Find the product and pool based on sourceUrl
    const product = await (prisma as any).product.findFirst({
      where: { sourceUrl: savedListing.url },
      include: {
        pool: true
      }
    });

    console.log('[Pool Progress API] Found product:', !!product, 'Pool:', !!product?.pool);

    if (!product?.pool) {
      // Return default values if no pool exists yet
      console.log('[Pool Progress API] No pool, returning defaults');
      return NextResponse.json({
        pledgedQty: 0,
        targetQty: 100,
        status: 'FORMING',
        moqReachedAt: null,
        deadlineAt: null
      });
    }

    const result = {
      pledgedQty: product.pool.pledgedQty,
      targetQty: product.pool.targetQty,
      status: product.pool.status,
      moqReachedAt: product.pool.moqReachedAt,
      deadlineAt: product.pool.deadlineAt
    };

    console.log('[Pool Progress API] Returning:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Pool Progress API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
