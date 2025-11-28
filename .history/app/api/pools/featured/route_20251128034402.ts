import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active pools with product and savedlisting data
    const pools = await prisma.pool.findMany({
      where: {
        status: 'OPEN',
        deadlineAt: {
          gte: new Date(), // Only pools that haven't expired
        },
      },
      include: {
        product: {
          include: {
            savedListing: true,
          },
        },
      },
      take: 100, // Get a good sample
    });

    // Calculate progress percentage for each pool and sort by highest progress
    const poolsWithProgress = pools
      .map((pool) => {
        const progressPercentage = (pool.pledgedQty / pool.targetQty) * 100;
        const daysLeft = Math.ceil(
          (pool.deadlineAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: pool.id,
          savedListingId: pool.product.savedListing?.id,
          title: pool.product.title || 'Untitled Product',
          image:
            pool.product.savedListing?.imageUrls?.[0] ||
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          category: pool.product.categories?.[0] || 'General',
          targetQty: pool.targetQty,
          pledgedQty: pool.pledgedQty,
          progressPercentage,
          price: pool.product.poolPrice || 0,
          originalPrice: pool.product.originalPrice || 0,
          daysLeft,
          status: pool.status,
        };
      })
      .filter((pool) => pool.savedListingId) // Only include pools with savedListing
      .sort((a, b) => b.progressPercentage - a.progressPercentage) // Sort by highest progress
      .slice(0, 6); // Get top 6

    return NextResponse.json({
      pools: poolsWithProgress,
    });
  } catch (error) {
    console.error('Error fetching featured pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured pools' },
      { status: 500 }
    );
  }
}
