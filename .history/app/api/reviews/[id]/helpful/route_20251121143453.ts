import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { auth } from '../../../../../auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviewId = params.id;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already voted
    const existingVote = await prisma.reviewHelpfulVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id,
        },
      },
    });

    if (existingVote) {
      // Remove vote
      await prisma.reviewHelpfulVote.delete({
        where: {
          id: existingVote.id,
        },
      });

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          helpful: {
            decrement: 1,
          },
        },
      });

      return NextResponse.json({ message: 'Vote removed' });
    } else {
      // Add vote
      await prisma.reviewHelpfulVote.create({
        data: {
          reviewId,
          userId: user.id,
        },
      });

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          helpful: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({ message: 'Vote added' });
    }
  } catch (error) {
    console.error('Failed to toggle helpful vote:', error);
    return NextResponse.json(
      { error: 'Failed to toggle helpful vote' },
      { status: 500 }
    );
  }
}
