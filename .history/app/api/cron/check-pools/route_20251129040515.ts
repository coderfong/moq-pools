import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const now = new Date();
    console.log(`[Cron] Checking pools at ${now.toISOString()}`);

    // Find pools that reached their deadline
    const expiredPools = await prisma.pool.findMany({
      where: {
        status: 'OPEN',
        deadlineAt: {
          lte: now,
        },
      },
      include: {
        items: {
          include: {
            payment: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${expiredPools.length} expired pools`);

    const results = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const pool of expiredPools) {
      try {
        // Check if MOQ was reached
        const moqReached = pool.pledgedQty >= pool.targetQty;
        
        console.log(`[Cron] Pool ${pool.id} (${pool.product?.title}): ${pool.pledgedQty}/${pool.targetQty} - MOQ ${moqReached ? 'REACHED' : 'NOT REACHED'}`);

        if (moqReached) {
          // Capture payments
          const captureResponse = await fetch(
            `${appUrl}/api/pools/capture-payments`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authorization': authHeader, // Pass through auth
              },
              body: JSON.stringify({ poolId: pool.id }),
            }
          );

          const captureResult = await captureResponse.json();
          
          results.push({
            poolId: pool.id,
            poolTitle: pool.product?.title,
            action: 'captured',
            success: captureResponse.ok,
            pledgedQty: pool.pledgedQty,
            targetQty: pool.targetQty,
            result: captureResult,
          });

          console.log(`[Cron] Pool ${pool.id} payments captured: ${captureResponse.ok ? 'SUCCESS' : 'FAILED'}`);
        } else {
          // Refund payments
          const refundResponse = await fetch(
            `${appUrl}/api/pools/refund-payments`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authorization': authHeader, // Pass through auth
              },
              body: JSON.stringify({
                poolId: pool.id,
                reason: 'Pool did not reach MOQ before deadline',
              }),
            }
          );

          const refundResult = await refundResponse.json();
          
          results.push({
            poolId: pool.id,
            poolTitle: pool.product?.title,
            action: 'refunded',
            success: refundResponse.ok,
            pledgedQty: pool.pledgedQty,
            targetQty: pool.targetQty,
            result: refundResult,
          });

          console.log(`[Cron] Pool ${pool.id} payments refunded: ${refundResponse.ok ? 'SUCCESS' : 'FAILED'}`);
        }
      } catch (poolError: any) {
        console.error(`[Cron] Error processing pool ${pool.id}:`, poolError);
        results.push({
          poolId: pool.id,
          poolTitle: pool.product?.title,
          action: 'error',
          success: false,
          error: poolError.message,
        });
      }
    }

    console.log(`[Cron] Processed ${results.length} pools`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      checked: expiredPools.length,
      results,
    });
  } catch (error: any) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}
