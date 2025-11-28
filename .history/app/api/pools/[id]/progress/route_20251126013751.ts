import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Fetch pool with minimal data for progress tracking
    const pool = await (prisma as any).pool.findUnique({
      where: { id },
      select: {
        pledgedQty: true,
        targetQty: true,
        status: true,
        items: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Count unique participants
    const uniqueUsers = new Set(pool.items.map((item: any) => item.userId));
    const participantCount = uniqueUsers.size;

    return NextResponse.json({
      pledgedQty: pool.pledgedQty,
      targetQty: pool.targetQty,
      status: pool.status,
      participantCount,
    });
  } catch (error) {
    console.error('Error fetching pool progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
