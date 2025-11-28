import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRateLimiter } from '@/lib/rateLimiter';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute
    const limiter = getRateLimiter('products-api', { capacity: 20, refillRate: 20/60 });
    if (!limiter.tryRemoveTokens(1)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const q = searchParams.get('q') || undefined;

    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const products = await prisma.product.findMany({
      where: {
        AND: [
          // Only show products from real source platforms (not seed data)
          {
            sourcePlatform: {
              in: ['ALIBABA', 'C1688', 'MADE_IN_CHINA', 'INDIAMART', 'GLOBAL_SOURCES'],
            },
          },
          // Exclude products with seed images
          {
            NOT: {
              imagesJson: {
                contains: '/seed/',
              },
            },
          },
          // Optional search filter
          q ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          } : {},
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50),
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
