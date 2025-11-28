import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const pools = await prisma.pool.findMany({
      where: status ? { status: status as any } : {},
      include: {
        product: true,
      },
      orderBy: [
        { pledgedQty: 'desc' }, // Prioritize pools with more pledges
        { createdAt: 'desc' },
      ],
      take: Math.min(limit, 50),
    });

    return NextResponse.json({ pools });
  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json({ error: 'Failed to fetch pools' }, { status: 500 });
  }
}
