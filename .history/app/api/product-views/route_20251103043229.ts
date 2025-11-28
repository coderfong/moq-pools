import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/src/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only track for logged-in users
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { savedListingId, productTitle, productImage, productUrl } = await request.json();

    if (!productTitle || !productUrl) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create product view record
    await prisma.productView.create({
      data: {
        userId: user.id,
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get product views for the user
    const views = await prisma.productView.findMany({
      where: { userId: user.id },
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
      where: { userId: user.id },
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
