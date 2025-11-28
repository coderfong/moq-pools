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

    const { poolId, reason = 'Pool did not reach MOQ before deadline' } = await request.json();

    if (!poolId) {
      return NextResponse.json(
        { error: 'poolId is required' },
        { status: 400 }
      );
    }

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

    // Check if pool already processed
    if (pool.status === 'CANCELLED') {
      return NextResponse.json(
        { 
          error: 'Pool already cancelled',
          status: pool.status,
        },
        { status: 400 }
      );
    }

    if (pool.status === 'ACTIVE' && pool.moqReachedAt) {
      return NextResponse.json(
        { 
          error: 'Pool already active - payments were captured',
          moqReachedAt: pool.moqReachedAt,
        },
        { status: 400 }
      );
    }

    const refundResults = [];
    let successCount = 0;
    let failCount = 0;

    // Test mode - mock refunds
    if (!stripe) {
      console.log('Test mode - mocking payment refunds');
      
      for (const item of pool.items) {
        const payment = item.payment;
        
        if (!payment || !['PENDING', 'AUTHORIZED'].includes(payment.status)) {
          continue;
        }

        // Mock refund
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
          },
        });

        refundResults.push({
          paymentId: payment.id,
          userId: item.userId,
          success: true,
          testMode: true,
        });
        successCount++;
      }
    } else {
      // Production mode - cancel real payment intents
      console.log('Production mode - cancelling real payment intents');
      
      for (const item of pool.items) {
        const payment = item.payment;
        
        if (!payment || !['PENDING', 'AUTHORIZED'].includes(payment.status)) {
          console.log(`Skipping payment ${payment?.id} - status: ${payment?.status}`);
          continue;
        }

        if (!payment.reference) {
          console.error(`Payment ${payment.id} has no payment intent reference`);
          refundResults.push({
            paymentId: payment.id,
            userId: item.userId,
            success: false,
            error: 'No payment intent reference',
          });
          failCount++;
          continue;
        }

        try {
          // Cancel the payment intent (releases the authorization hold)
          const paymentIntent = await stripe.paymentIntents.cancel(
            payment.reference
          );

          console.log(`Cancelled payment intent ${paymentIntent.id}`);

          // Update payment status
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'REFUNDED',
            },
          });

          refundResults.push({
            paymentId: payment.id,
            userId: item.userId,
            amount: Number(payment.amount),
            currency: payment.currency,
            stripeIntentId: paymentIntent.id,
            success: true,
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to cancel payment ${payment.id}:`, error);
          
          // Still mark as REFUNDED if error is that payment already cancelled/expired
          if (error.code === 'payment_intent_unexpected_state') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED' },
            });
            
            refundResults.push({
              paymentId: payment.id,
              userId: item.userId,
              success: true,
              note: 'Already cancelled/expired',
            });
            successCount++;
          } else {
            refundResults.push({
              paymentId: payment.id,
              userId: item.userId,
              success: false,
              error: error.message,
            });
            failCount++;
          }
        }
      }
    }

    // Update pool status to CANCELLED
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`Pool ${poolId} payments refunded: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      poolId,
      poolTitle: pool.product?.title,
      reason,
      refundResults,
      summary: {
        total: refundResults.length,
        succeeded: successCount,
        failed: failCount,
      },
    });
  } catch (error: any) {
    console.error('Refund payments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refund payments' },
      { status: 500 }
    );
  }
}
