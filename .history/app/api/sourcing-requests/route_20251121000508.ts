import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    // Get form data
    const body = await req.json();
    const {
      productName,
      productDescription,
      category,
      specifications,
      quantity,
      targetPrice,
      currency,
      timeline,
      deliveryAddress,
      country,
      additionalNotes,
    } = body;

    // Validation
    if (!productName || !category || !productDescription || !quantity || !targetPrice || !timeline || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create sourcing request in database
    if (prisma) {
      const sourcingRequest = await prisma.sourcingRequest.create({
        data: {
          userId: session?.user?.email || null,
          productName,
          productDescription,
          category,
          specifications,
          quantity: parseInt(quantity),
          targetPrice: parseFloat(targetPrice),
          currency,
          timeline,
          deliveryAddress,
          country,
          additionalNotes,
          status: 'PENDING',
        },
      });

      // TODO: Send notification email to admin team
      // TODO: Send confirmation email to user

      return NextResponse.json({
        success: true,
        requestId: sourcingRequest.id,
        message: 'Sourcing request submitted successfully',
      });
    }

    // Fallback if no database
    return NextResponse.json({
      success: true,
      message: 'Sourcing request received (demo mode)',
    });
  } catch (error) {
    console.error('Error submitting sourcing request:', error);
    return NextResponse.json(
      { error: 'Failed to submit sourcing request' },
      { status: 500 }
    );
  }
}
