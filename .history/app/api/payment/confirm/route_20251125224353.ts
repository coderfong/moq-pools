import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      paymentIntentId,
      poolId,
      listingId,
      amount,
      currency,
      shippingAddress,
    } = body;
    
    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing payment intent ID' },
        { status: 400 }
      );
    }

    const session = getSession();
    if (!session?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Confirming payment:', {
      paymentIntentId,
      poolId,
      listingId,
      userId: session.sub,
      shippingAddress,
    });

    // Update payment status to AUTHORIZED (funds held in escrow)
    if (poolId && prisma) {
      try {
        // Find the pool item and update payment status
        const poolItems = await (prisma as any).poolItem.findMany({
          where: {
            poolId,
            userId: session.sub,
          },
          include: {
            payment: true,
          },
        });

        for (const item of poolItems) {
          if (item.payment && item.payment.status === 'REQUIRES_ACTION') {
            await (prisma as any).payment.update({
              where: { id: item.payment.id },
              data: {
                status: 'AUTHORIZED',
                reference: paymentIntentId,
              },
            });
            console.log(`Payment ${item.payment.id} updated to AUTHORIZED`);
          }
        }
      } catch (paymentError) {
        console.error('Failed to update payment status:', paymentError);
        // Don't fail the confirmation if status update fails
      }
    }

    // Create conversation for this order
    if (poolId && prisma) {
      try {
        // Get pool and product details
        const pool = await (prisma as any).pool.findUnique({
          where: { id: poolId },
          include: { 
            product: { 
              select: { 
                title: true, 
                imagesJson: true 
              } 
            } 
          }
        });
        
        if (pool) {
          // Get product image
          let productImage: string | null = null;
          if (pool.product?.imagesJson) {
            try {
              const images = JSON.parse(pool.product.imagesJson);
              productImage = Array.isArray(images) && images[0] ? String(images[0]) : null;
            } catch {}
          }
          
          // Create conversation
          const conversation = await (prisma as any).conversation.create({
            data: {
              title: pool.product?.title || 'Your Pool Order',
              company: 'PoolBuy',
              avatarUrl: productImage,
              preview: `Your order for ${pool.product?.title || 'this product'} has been placed in escrow. We'll keep you updated!`,
              updatedAt: new Date(),
            }
          });
          
          // Add user as participant
          await (prisma as any).conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              userId: session.sub,
            }
          });
          
          // Add admin as participant
          const adminUser = await (prisma as any).user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true }
          });
          
          if (adminUser) {
            await (prisma as any).conversationParticipant.create({
              data: {
                conversationId: conversation.id,
                userId: adminUser.id,
              }
            });
            
            // Create initial admin message
            await (prisma as any).message.create({
              data: {
                conversationId: conversation.id,
                senderUserId: adminUser.id,
                sender: null,
                text: `Thank you for joining the pool for **${pool.product?.title || 'this product'}**! 🎉\n\nYour payment of ${amount?.toFixed(2) || ''} ${currency || 'USD'} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`,
              }
            });
          }
        }
      } catch (convError) {
        console.error('Failed to create conversation:', convError);
        // Don't fail the payment confirmation if conversation creation fails
      }
    }
    
    return NextResponse.json({
      success: true,
      orderId: paymentIntentId,
      message: 'Payment confirmed successfully',
    });
    
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
