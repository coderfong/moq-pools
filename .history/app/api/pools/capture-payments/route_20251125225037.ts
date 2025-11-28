import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover' as any,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    // Check authentication - require admin or system access
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { poolId } = await request.json();

    if (!poolId) {
      return NextResponse.json(
        { error: 'poolId is required' },
        { status: 400 }
      );
    }

    // Check if pool reached MOQ
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        items: {
          include: {
            payment: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        product: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Verify pool reached MOQ
    if (pool.pledgedQty < pool.targetQty) {
      return NextResponse.json(
        { 
          error: 'Pool has not reached MOQ yet',
          pledgedQty: pool.pledgedQty,
          targetQty: pool.targetQty,
        },
        { status: 400 }
      );
    }

    // Check if already processed
    if (pool.moqReachedAt) {
      return NextResponse.json(
        { 
          error: 'Pool payments already captured',
          capturedAt: pool.moqReachedAt,
        },
        { status: 400 }
      );
    }

    const captureResults = [];
    let successCount = 0;
    let failCount = 0;

    // Test mode - mock captures
    if (!stripe) {
      console.log('Test mode - mocking payment captures');
      
      for (const item of pool.items) {
        const payment = item.payment;
        
        if (!payment || !['PENDING', 'AUTHORIZED'].includes(payment.status)) {
          continue;
        }

        // Mock capture
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            paidAt: new Date(),
          },
        });

        captureResults.push({
          paymentId: payment.id,
          userId: item.userId,
          success: true,
          testMode: true,
        });
        successCount++;
      }
    } else {
      // Production mode - capture real payments
      console.log('Production mode - capturing real payment intents');
      
      for (const item of pool.items) {
        const payment = item.payment;
        
        if (!payment || !['PENDING', 'AUTHORIZED'].includes(payment.status)) {
          console.log(`Skipping payment ${payment?.id} - status: ${payment?.status}`);
          continue;
        }

        if (!payment.reference) {
          console.error(`Payment ${payment.id} has no payment intent reference`);
          captureResults.push({
            paymentId: payment.id,
            userId: item.userId,
            success: false,
            error: 'No payment intent reference',
          });
          failCount++;
          continue;
        }

        try {
          // Capture the payment intent
          const paymentIntent = await stripe.paymentIntents.capture(
            payment.reference
          );

          console.log(`Captured payment intent ${paymentIntent.id}`);

          // Update payment status in database
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'CAPTURED',
              paidAt: new Date(),
            },
          });

          captureResults.push({
            paymentId: payment.id,
            userId: item.userId,
            amount: Number(payment.amount),
            currency: payment.currency,
            stripeIntentId: paymentIntent.id,
            success: true,
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to capture payment ${payment.id}:`, error);
          
          // Update payment status to FAILED
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });

          captureResults.push({
            paymentId: payment.id,
            userId: item.userId,
            success: false,
            error: error.message,
          });
          failCount++;
        }
      }
    }

    // Update pool status to ACTIVE (order placed with supplier)
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        status: 'ACTIVE',
        moqReachedAt: new Date(),
      },
    });

    console.log(`Pool ${poolId} payments captured: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      poolId,
      poolTitle: pool.product?.title,
      moqReachedAt: new Date(),
      captureResults,
      summary: {
        total: captureResults.length,
        succeeded: successCount,
        failed: failCount,
      },
    });
  } catch (error: any) {
    console.error('Capture payments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture payments' },
      { status: 500 }
    );
  }
}
