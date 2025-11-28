import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentId = searchParams.get('id');
    const categoriesParam = searchParams.get('categories');

    if (!currentId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];

    let similarProducts;

    if (categories.length > 0) {
      // Find products that share at least one category
      similarProducts = await (prisma as any).savedListing.findMany({
        where: {
          AND: [
            { id: { not: currentId } }, // Exclude current product
            {
              OR: categories.map(cat => ({
                categories: { has: cat }
              }))
            }
          ]
        },
        select: {
          id: true,
          title: true,
          image: true,
          priceMin: true,
          priceMax: true,
          currency: true,
          moq: true,
          platform: true
        },
        take: 12, // Fetch more than we need for variety
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // If no categories, just get recent products
      similarProducts = await (prisma as any).savedListing.findMany({
        where: {
          id: { not: currentId }
        },
        select: {
          id: true,
          title: true,
          image: true,
          priceMin: true,
          priceMax: true,
          currency: true,
          moq: true,
          platform: true
        },
        take: 12,
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json({ products: similarProducts });
  } catch (error) {
    console.error('[Similar Products API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
