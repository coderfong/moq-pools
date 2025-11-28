import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPoolProgressEmail, checkAndNotifyPoolProgress } from '@/lib/poolNotifications';

// This endpoint can be called after a new pool item is created
// POST /api/pools/check-progress
export async function POST(req: NextRequest) {
  try {
    const { poolId } = await req.json();

    if (!poolId) {
      return NextResponse.json({ error: 'poolId is required' }, { status: 400 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get pool details
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        product: true,
        items: {
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    const currentCount = pool.items.length;
    const targetMoq = pool.product.moqQty;

    // Check if we should send notifications
    const milestone = await checkAndNotifyPoolProgress(
      poolId,
      currentCount,
      targetMoq,
      pool.progressMilestone || 'NONE'
    );

    if (milestone) {
      // Update pool milestone
      await prisma.pool.update({
        where: { id: poolId },
        data: {
          progressMilestone: milestone === 'MOQ_REACHED' ? 'MOQ' : milestone === '90' ? 'NINETY' : 'FIFTY',
        },
      });

      // Send emails to all participants
      const emailPromises = pool.items
        .filter((item) => item.user?.email)
        .map((item) =>
          sendPoolProgressEmail(item.user!.email!, {
            poolId: pool.id,
            productTitle: pool.product.title,
            currentProgress: currentCount,
            targetMoq,
            milestone,
            poolUrl: `${process.env.APP_BASE_URL}/pools/${pool.id}`,
          }).catch((err) => {
            console.error(`Failed to send email to ${item.user!.email}:`, err);
          })
        );

      await Promise.allSettled(emailPromises);

      return NextResponse.json({
        success: true,
        milestone,
        notificationsSent: emailPromises.length,
      });
    }

    return NextResponse.json({
      success: true,
      milestone: null,
      message: 'No milestone reached',
    });
  } catch (error) {
    console.error('Error checking pool progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
