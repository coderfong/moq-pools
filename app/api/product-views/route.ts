import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    
    // Only track for logged-in users
    if (!session?.sub || !prisma) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { savedListingId, productTitle, productImage, productUrl } = await request.json();

    if (!productTitle || !productUrl) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Create product view record
    await prisma.productView.create({
      data: {
        userId: session.sub,
        savedListingId: savedListingId || null,
        productTitle,
        productImage: productImage || null,
        productUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking product view:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession();
    
    if (!session?.sub || !prisma) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get product views for the user
    const views = await prisma.productView.findMany({
      where: { userId: session.sub },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        savedListing: {
          select: {
            id: true,
            title: true,
            image: true,
            priceMin: true,
            priceMax: true,
            currency: true,
            moq: true,
            storeName: true,
          },
        },
      },
    });

    const total = await prisma.productView.count({
      where: { userId: session.sub },
    });

    return NextResponse.json({ 
      success: true, 
      views,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching product views:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
