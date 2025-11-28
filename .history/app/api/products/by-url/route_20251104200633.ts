import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Find the product by URL
    const listing = await prisma.savedListing.findUnique({
      where: { url },
      select: {
        id: true,
        platform: true,
        url: true,
        title: true,
        image: true,
        priceRaw: true,
        priceMin: true,
        priceMax: true,
        currency: true,
        moqRaw: true,
        moq: true,
        storeName: true,
        description: true,
        categories: true,
        terms: true,
        ratingRaw: true,
        ordersRaw: true,
        detailJson: true,
        detailUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse detailJson if it's a string
    let detailJson = listing.detailJson;
    if (typeof detailJson === 'string') {
      try {
        detailJson = JSON.parse(detailJson);
      } catch {
        detailJson = null;
      }
    }

    const product = {
      ...listing,
      detailJson,
    };

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product by URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
