import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../auth';

// GET /api/wishlist - Get user's wishlist
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        savedListing: true,
        product: {
          include: {
            supplier: true,
            pool: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items: wishlistItems });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      savedListingId, 
      productId, 
      productTitle, 
      productImage, 
      productUrl,
      productPrice,
      productMoq,
      platform,
      notes 
    } = body;

    // Validate that at least one ID is provided
    if (!savedListingId && !productId) {
      return NextResponse.json(
        { error: 'Either savedListingId or productId is required' },
        { status: 400 }
      );
    }

    // Check if item already exists in wishlist
    const existing = await prisma.wishlist.findFirst({
      where: {
        userId: user.id,
        OR: [
          savedListingId ? { savedListingId } : {},
          productId ? { productId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Item already in wishlist', item: existing },
        { status: 409 }
      );
    }

    // Create wishlist item
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: user.id,
        savedListingId: savedListingId || null,
        productId: productId || null,
        productTitle,
        productImage: productImage || null,
        productUrl,
        productPrice: productPrice || null,
        productMoq: productMoq || null,
        platform: platform || null,
        notes: notes || null,
      },
      include: {
        savedListing: true,
        product: true,
      },
    });

    return NextResponse.json({ item: wishlistItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const wishlistId = searchParams.get('id');
    const savedListingId = searchParams.get('savedListingId');
    const productId = searchParams.get('productId');

    if (!wishlistId && !savedListingId && !productId) {
      return NextResponse.json(
        { error: 'Either id, savedListingId, or productId is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = { userId: user.id };
    if (wishlistId) {
      where.id = wishlistId;
    } else if (savedListingId) {
      where.savedListingId = savedListingId;
    } else if (productId) {
      where.productId = productId;
    }

    const deleted = await prisma.wishlist.deleteMany({ where });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Item not found in wishlist' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: deleted.count });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
