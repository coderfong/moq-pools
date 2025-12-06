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

    // Find the saved listing with MOQ data
    const savedListing = await (prisma as any).savedListing.findUnique({
      where: { id: savedListingId },
      select: { url: true, moq: true, detailJson: true }
    });

    console.log('[Pool Progress API] Found listing:', !!savedListing);

    if (!savedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Extract MOQ from listing data
    let moqValue = 100; // Default fallback
    if (savedListing.moq) {
      moqValue = savedListing.moq;
    } else if (savedListing.detailJson) {
      try {
        const detailData = typeof savedListing.detailJson === 'string' 
          ? JSON.parse(savedListing.detailJson) 
          : savedListing.detailJson;
        if (detailData?.moq) {
          moqValue = Number(detailData.moq);
        }
      } catch {}
    }

    console.log('[Pool Progress API] MOQ value:', moqValue);

    // Find the product and pool based on sourceUrl
    const product = await (prisma as any).product.findFirst({
      where: { sourceUrl: savedListing.url },
      include: {
        pool: true
      }
    });

    console.log('[Pool Progress API] Found product:', !!product, 'Pool:', !!product?.pool);

    if (!product?.pool) {
      // Return default values if no pool exists yet, using actual MOQ
      console.log('[Pool Progress API] No pool, returning defaults with MOQ:', moqValue);
      return NextResponse.json({
        pledgedQty: 0,
        targetQty: moqValue,
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
