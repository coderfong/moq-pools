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

        // Get image - prioritize actual product images from detailJson or image field
        let imageUrl = '/cache/placeholder.jpg'; // Fallback only if no image exists
        
        // First priority: detailJson.imageUrls from scraped data
        if (savedListing?.detailJson && typeof savedListing.detailJson === 'object') {
          const detail = savedListing.detailJson as any;
          if (detail.imageUrls && Array.isArray(detail.imageUrls) && detail.imageUrls.length > 0) {
            imageUrl = detail.imageUrls[0];
          } else if (detail.images && Array.isArray(detail.images) && detail.images.length > 0) {
            imageUrl = detail.images[0];
          }
        }
        
        // Second priority: SavedListing image field
        if (imageUrl === '/cache/placeholder.jpg' && savedListing?.image) {
          imageUrl = savedListing.image;
        }
        
        // Third priority: Product imagesJson
        if (imageUrl === '/cache/placeholder.jpg' && product?.imagesJson) {
          try {
            const images = typeof product.imagesJson === 'string' 
              ? JSON.parse(product.imagesJson) 
              : product.imagesJson;
            if (Array.isArray(images) && images.length > 0) {
              imageUrl = images[0];
            }
          } catch (e) {
            console.error('Error parsing product imagesJson:', e);
          }
        }

        // Get actual price from product, with fallback to SavedListing
        const actualPrice = Number(product.unitPrice || savedListing?.priceMin || 0);
        const originalPrice = savedListing?.priceMax || actualPrice * 2;

        // Calculate actual days, hours, minutes left for countdown
        const deadlineTime = pool.deadlineAt.getTime();
        const now = Date.now();
        const timeLeftMs = Math.max(0, deadlineTime - now);
        const daysLeftActual = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

        // Get actual number of users in the pool
        const userCount = await prisma!.poolItem.count({
          where: {
            poolId: pool.id,
          },
        });

        return {
          id: pool.id,
          savedListingId: savedListing?.id || pool.productId,
          title: product.title || savedListing?.title || 'Untitled Product',
          image: imageUrl,
          category: savedListing?.categories?.[0] || 'general',
          targetQty: pool.targetQty,
          pledgedQty: pool.pledgedQty,
          progressPercentage,
          price: actualPrice,
          originalPrice: originalPrice,
          daysLeft: daysLeftActual,
          hoursLeft,
          minutesLeft,
          deadlineAt: pool.deadlineAt.toISOString(),
          userCount,
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
