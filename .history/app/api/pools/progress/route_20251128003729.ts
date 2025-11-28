import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedListingId = searchParams.get('savedListingId');

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

    if (!product?.pool) {
      // Return default values if no pool exists yet
      return NextResponse.json({
        pledgedQty: 0,
        targetQty: 100,
        status: 'FORMING',
        moqReachedAt: null,
        deadlineAt: null
      });
    }

    return NextResponse.json({
      pledgedQty: product.pool.pledgedQty,
      targetQty: product.pool.targetQty,
      status: product.pool.status,
      moqReachedAt: product.pool.moqReachedAt,
      deadlineAt: product.pool.deadlineAt
    });
  } catch (error) {
    console.error('Error fetching pool progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
