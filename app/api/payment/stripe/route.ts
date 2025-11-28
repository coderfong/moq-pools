import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      cardNumber,
      expiryDate,
      cvv,
      cardName,
      email,
      country,
      zipCode,
    } = body;
    
    // Validate required fields
    if (!amount || !currency || !cardNumber || !expiryDate || !cvv || !cardName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('Stripe payment request:', {
      amount,
      currency,
      quantity,
      listingId,
      poolId,
      email,
      country,
      zipCode,
      cardLast4: cardNumber.slice(-4),
    });
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // Test mode - simulate payment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isTestCard = cardNumber.replace(/\s/g, '').startsWith('4242');
      
      if (isTestCard) {
        const orderId = `ord_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Create conversation for test order too
        try {
          const { getSession } = await import('../../_lib/session');
          const session = getSession();
          
          if (session?.sub && poolId && prisma) {
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
              let productImage: string | null = null;
              if (pool.product?.imagesJson) {
                try {
                  const images = JSON.parse(pool.product.imagesJson);
                  productImage = Array.isArray(images) && images[0] ? String(images[0]) : null;
                } catch {}
              }
              
              const conversation = await (prisma as any).conversation.create({
                data: {
                  title: pool.product?.title || 'Your Pool Order',
                  company: 'PoolBuy',
                  avatarUrl: productImage,
                  preview: `Your order for ${pool.product?.title || 'this product'} has been placed in escrow. We'll keep you updated!`,
                  updatedAt: new Date(),
                }
              });
              
              await (prisma as any).conversationParticipant.create({
                data: {
                  conversationId: conversation.id,
                  userId: session.sub,
                }
              });
              
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
                
                await (prisma as any).message.create({
                  data: {
                    conversationId: conversation.id,
                    senderUserId: adminUser.id,
                    sender: null,
                    text: `Thank you for joining the pool for **${pool.product?.title || 'this product'}**! 🎉\n\nYour payment of ${amount.toFixed(2)} ${currency} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`,
                  }
                });
              }
            }
          }
        } catch (convError) {
          console.error('Failed to create conversation (test mode):', convError);
        }
        
        return NextResponse.json({
          success: true,
          orderId,
          message: 'Payment successful (test mode - no Stripe key configured)',
        });
      } else {
        return NextResponse.json(
          { error: 'Test mode: Use card 4242 4242 4242 4242 for demo' },
          { status: 400 }
        );
      }
    }
    
    // Production mode with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Parse expiry date
    const [expMonth, expYear] = expiryDate.split('/');
    const fullYear = parseInt('20' + expYear);
    
    // Create a PaymentMethod
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(expMonth),
        exp_year: fullYear,
        cvc: cvv,
      },
      billing_details: {
        name: cardName,
        email: email,
        address: {
          country: country,
          postal_code: zipCode,
        },
      },
    });
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        listingId: listingId || '',
        poolId: poolId || '',
        quantity: quantity.toString(),
      },
      description: `MOQ Pool Order - ${quantity} units`,
    });
    
    if (paymentIntent.status === 'succeeded') {
      // Create conversation for this order
      try {
        const { getSession } = await import('../../_lib/session');
        const session = getSession();
        
        if (session?.sub && poolId && prisma) {
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
            
            // Add admin as participant (find first admin user)
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
                  text: `Thank you for joining the pool for **${pool.product?.title || 'this product'}**! 🎉\n\nYour payment of ${amount.toFixed(2)} ${currency} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`,
                }
              });
            }
          }
        }
      } catch (convError) {
        console.error('Failed to create conversation:', convError);
        // Don't fail the payment if conversation creation fails
      }
      
      return NextResponse.json({
        success: true,
        orderId: paymentIntent.id,
        message: 'Payment successful',
      });
    } else if (paymentIntent.status === 'requires_action') {
      return NextResponse.json(
        { error: '3D Secure authentication required. Please use a different card.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Payment failed. Please check your card details.' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Stripe payment error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}
