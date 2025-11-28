import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    // Fetch all active pools with product data
    const pools = await prisma.pool.findMany({
      where: {
        status: 'OPEN',
        deadlineAt: {
          gte: new Date(), // Only pools that haven't expired
        },
      },
      include: {
        product: true,
      },
      take: 100, // Get a good sample
    });

    // For each pool, find the matching SavedListing
    const poolsWithData = await Promise.all(
      pools.map(async (poolWithProduct) => {
        const pool = poolWithProduct;
        const product = pool.product;

        // Find SavedListing where url matches Product.sourceUrl
        const savedListing = product.sourceUrl
          ? await prisma!.savedListing.findFirst({
              where: {
                url: product.sourceUrl,
              },
            })
          : null;

        const progressPercentage = (pool.pledgedQty / pool.targetQty) * 100;
        const daysLeft = Math.ceil(
          (pool.deadlineAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Get image - try detailJson first, then image field, then fallback
        let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
        if (savedListing?.detailJson && typeof savedListing.detailJson === 'object') {
          const detail = savedListing.detailJson as any;
          if (detail.imageUrls && Array.isArray(detail.imageUrls) && detail.imageUrls.length > 0) {
            imageUrl = detail.imageUrls[0];
          }
        } else if (savedListing?.image) {
          imageUrl = savedListing.image;
        }

        return {
          id: pool.id,
          savedListingId: savedListing?.id || null,
          title: product.title || savedListing?.title || 'Untitled Product',
          image: imageUrl,
          category: savedListing?.categories?.[0] || 'General',
          targetQty: pool.targetQty,
          pledgedQty: pool.pledgedQty,
          progressPercentage,
          price: Number(product.unitPrice || 0),
          originalPrice: savedListing?.priceMax || Number(product.unitPrice || 0) * 2,
          daysLeft,
          status: pool.status,
        };
      })
    );

    // Filter only pools with savedListing and sort by progress
    const topPools = poolsWithData
      .filter((pool) => pool.savedListingId)
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 6);

    return NextResponse.json({
      pools: topPools,
    });
  } catch (error) {
    console.error('Error fetching featured pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured pools' },
      { status: 500 }
    );
  }
}
