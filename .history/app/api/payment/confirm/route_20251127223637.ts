import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';
import { sendPoolJoinConfirmationEmail, sendAdminPoolJoinNotification } from '@/lib/email';
import { 
  createUserAlert, 
  createAdminAlert, 
  notifyExistingPoolParticipants,
  checkAndUpdatePoolMilestone 
} from '@/lib/notifications';
import { updatePoolItemStatus } from '@/lib/poolItemStatus';

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

    // If no poolId but we have a listingId, find or create the pool for this listing
    let effectivePoolId = poolId;
    
    if (!effectivePoolId && listingId && prisma) {
      console.log('No poolId provided, looking for pool via listingId:', listingId);
      
      try {
        // First, check if this listing is linked to a product with a pool
        const listing = await (prisma as any).savedListing.findUnique({
          where: { id: listingId },
          select: { 
            id: true, 
            title: true,
            moq: true,
            platform: true,
            url: true,
            image: true,
            description: true,
            priceMin: true,
            currency: true
          }
        });
        
        if (listing) {
          console.log('Found listing:', listing.title);
          
          // CRITICAL: First try to find a Product that was created FROM this exact listing URL
          // This prevents duplicate products for the same listing
          const existingProduct = await (prisma as any).product.findFirst({
            where: {
              sourceUrl: listing.url,
            },
            include: { pool: true }
          });
          
          if (existingProduct?.pool) {
            effectivePoolId = existingProduct.pool.id;
            console.log('✅ Found existing pool via listing URL:', effectivePoolId);
          } else if (existingProduct && !existingProduct.pool) {
            console.log('⚠️ Found product but no pool - this should not happen');
          } else {
            // No product exists for this listing yet - search by title/platform as fallback
            const existingPool = await (prisma as any).pool.findFirst({
              where: {
                status: 'OPEN',
                product: {
                  sourcePlatform: listing.platform,
                  title: listing.title
                }
              },
              include: { product: true }
            });
            
            if (existingPool) {
              effectivePoolId = existingPool.id;
              console.log('Found existing pool via title match:', effectivePoolId);
            } else {
              console.log('No existing pool found. Creating new pool and product for this listing...');
              
              // Create Product and Pool for this listing
              try {
              // Create a Supplier (use a default system supplier)
              let supplier = await (prisma as any).supplier.findFirst({
                where: { name: 'System' }
              });
              
              if (!supplier) {
                // Create system supplier if it doesn't exist
                const systemUser = await (prisma as any).user.findFirst({
                  where: { role: 'ADMIN' }
                });
                
                if (systemUser) {
                  supplier = await (prisma as any).supplier.create({
                    data: {
                      userId: systemUser.id,
                      name: 'System',
                      contactEmail: process.env.ADMIN_EMAIL || 'admin@poolbuy.com',
                    }
                  });
                }
              }
              
              if (supplier) {
                // Extract price from listing
                const unitPrice = listing.priceMin || 1.0;
                const moqQty = listing.moq || 100;
                
                // Parse images
                let imagesJson = '[]';
                if (listing.image) {
                  imagesJson = JSON.stringify([listing.image]);
                }
                
                // Create Product (marked as inactive to prevent showing in browse page)
                // Products created from SavedListings should not appear as separate listings
                const product = await (prisma as any).product.create({
                  data: {
                    supplierId: supplier.id,
                    title: listing.title,
                    description: listing.description || `Quality ${listing.title}`,
                    imagesJson,
                    baseCurrency: listing.currency || 'USD',
                    unitPrice,
                    moqQty,
                    maxQtyPerUser: Math.max(moqQty * 2, 500),
                    leadTimeDays: 14,
                    isActive: false, // Don't show as a separate listing - pool progress shows on SavedListing card
                    sourcePlatform: listing.platform,
                    sourceUrl: listing.url, // Link back to original listing for pool progress display
                  }
                });
                
                // Create Pool with 30-day deadline
                const deadlineAt = new Date();
                deadlineAt.setDate(deadlineAt.getDate() + 30);
                
                const newPool = await (prisma as any).pool.create({
                  data: {
                    productId: product.id,
                    status: 'OPEN',
                    targetQty: moqQty,
                    pledgedQty: 0,
                    deadlineAt,
                  }
                });
                
                effectivePoolId = newPool.id;
                console.log(`✅ Created new pool ${effectivePoolId} for listing ${listing.id}`);
              }
              } catch (createError) {
                console.error('Failed to create pool for listing:', createError);
              }
            }
          }
        }
      } catch (lookupError) {
        console.error('Error looking up pool for listing:', lookupError);
      }
    }

    // Create or update pool item and payment
    if (effectivePoolId && prisma) {
      try {
        // Get pool and product details
        const pool = await (prisma as any).pool.findUnique({
          where: { id: effectivePoolId },
          include: { product: true }
        });

        if (!pool) {
          console.error('Pool not found:', poolId);
          return NextResponse.json(
            { error: 'Pool not found' },
            { status: 404 }
          );
        }

        // Check if pool item already exists for this user
        let poolItem = await (prisma as any).poolItem.findFirst({
          where: {
            poolId,
            userId: session.sub,
          },
          include: {
            payment: true,
          },
        });

        if (!poolItem) {
          // Create new pool item since it doesn't exist
          console.log('Creating new pool item for payment confirmation');
          
          // Create or get user's address
          let address = await (prisma as any).address.findFirst({
            where: {
              userId: session.sub,
              line1: shippingAddress.line1,
              city: shippingAddress.city,
              postal: shippingAddress.postalCode,
              country: shippingAddress.country,
            },
          });

          if (!address) {
            address = await (prisma as any).address.create({
              data: {
                userId: session.sub,
                line1: shippingAddress.line1,
                line2: shippingAddress.line2 || null,
                city: shippingAddress.city,
                state: shippingAddress.state || null,
                postal: shippingAddress.postalCode,
                country: shippingAddress.country,
                phone: shippingAddress.phone || null,
              },
            });
          }

          // Calculate quantity from amount and unit price
          const unitPrice = Number(pool.product.unitPrice);
          const quantity = Math.round(amount / unitPrice);

          // Create pool item
          poolItem = await (prisma as any).poolItem.create({
            data: {
              poolId: pool.id,
              userId: session.sub,
              quantity,
              unitPrice: pool.product.unitPrice,
              currency: pool.product.baseCurrency || currency,
              addressId: address.id,
            },
          });

          // Create payment record
          const payment = await (prisma as any).payment.create({
            data: {
              poolItemId: poolItem.id,
              method: 'STRIPE',
              amount,
              currency: currency || pool.product.baseCurrency,
              status: 'AUTHORIZED',
              reference: paymentIntentId,
              paidAt: new Date(),
            },
          });

          // Update pool item status to PAYMENT_CONFIRMED
          await updatePoolItemStatus({
            poolItemId: poolItem.id,
            newStatus: 'PAYMENT_CONFIRMED',
            notes: `Payment authorized via Stripe (${paymentIntentId})`,
            isAutomated: true,
          });

          // Find the SavedListing ID for correct navigation links
          let savedListingId = null;
          if (pool.product.sourceUrl) {
            try {
              const savedListing = await (prisma as any).savedListing.findFirst({
                where: { url: pool.product.sourceUrl },
                select: { id: true }
              });
              if (savedListing) {
                savedListingId = savedListing.id;
                console.log('[POOL ITEM CREATE] Found SavedListing:', savedListingId);
              }
            } catch (e) {
              console.log('[POOL ITEM CREATE] Could not find SavedListing for sourceUrl');
            }
          }

          const poolLink = savedListingId ? `/pools/${savedListingId}` : '/account/orders';

          // Create PAYMENT alert for user
          await createUserAlert({
            userId: session.sub,
            type: 'PAYMENT',
            title: 'Payment Confirmed ✅',
            body: `Your payment of ${amount.toFixed(2)} ${currency || 'USD'} for ${pool.product.title} has been confirmed and held in escrow.`,
            link: `/account/orders`,
            poolId: pool.id,
            productName: pool.product.title,
          });

          // Create ORDER alert for user
          await createUserAlert({
            userId: session.sub,
            type: 'ORDER',
            title: 'Order Placed in Pool 🎉',
            body: `You've successfully joined the pool for ${pool.product.title}. We'll notify you when the MOQ is reached!`,
            link: poolLink,
            poolId: pool.id,
            productName: pool.product.title,
          });

          // Increment pool's pledgedQty
          const updatedPool = await (prisma as any).pool.update({
            where: { id: pool.id },
            data: { pledgedQty: { increment: quantity } },
          });

          console.log(`Created pool item ${poolItem.id} and incremented pledgedQty by ${quantity}`);

          // ============================================================
          // POST-JOIN EVENTS: Trigger automated notifications and updates
          // ============================================================

          console.log('[PAYMENT CONFIRM] Starting post-join notifications...');

          // Get user details for notifications
          const user = await (prisma as any).user.findUnique({
            where: { id: session.sub },
            select: { name: true, email: true },
          });

          const userName = user?.name || 'User';
          const userEmail = user?.email || '';

          console.log(`[PAYMENT CONFIRM] User: ${userName} (${userEmail})`);

          // 1. Create in-app alert/notification for the user
          try {
            const welcomeAlert = await createUserAlert({
              userId: session.sub,
              type: 'GROUP_UPDATE',
              title: `Welcome to the pool for ${pool.product.title}!`,
              body: `Your payment of ${amount.toFixed(2)} ${currency} is now held securely in escrow. Pool progress: ${updatedPool.pledgedQty}/${pool.targetQty} units.`,
              link: poolLink,
              poolId: pool.id,
              productName: pool.product.title,
            });
            console.log('[PAYMENT CONFIRM] ✅ Welcome alert created:', welcomeAlert?.id);
          } catch (alertError) {
            console.error('[PAYMENT CONFIRM] ❌ Failed to create welcome alert:', alertError);
          }

          // 2. Send confirmation email to the user
          if (userEmail) {
            console.log('[PAYMENT CONFIRM] Sending confirmation email to:', userEmail);
            sendPoolJoinConfirmationEmail({
              userName,
              userEmail,
              productTitle: pool.product.title,
              productUrl: pool.product.sourceUrl || undefined,
              poolId: pool.id,
              quantity,
              amount,
              currency: currency || pool.product.baseCurrency,
              currentProgress: updatedPool.pledgedQty,
              targetQty: pool.targetQty,
              deadlineAt: pool.deadlineAt,
            }).catch((err) => {
              console.error('[PAYMENT CONFIRM] ❌ Failed to send pool join confirmation email:', err);
            });
          } else {
            console.log('[PAYMENT CONFIRM] ⚠️ No email address - skipping confirmation email');
          }

          // 3. Notify admin of new pool participant
          console.log('[PAYMENT CONFIRM] Creating admin alert...');
          createAdminAlert({
            type: 'GROUP_UPDATE',
            title: `New participant: ${pool.product.title}`,
            body: `${userName} (${userEmail}) joined the pool with ${quantity} units. Pool at ${updatedPool.pledgedQty}/${pool.targetQty}.`,
            link: poolLink,
          }).then((alerts) => {
            console.log('[PAYMENT CONFIRM] ✅ Admin alerts created:', alerts?.length || 0);
          }).catch((err) => {
            console.error('[PAYMENT CONFIRM] ❌ Failed to create admin alert:', err);
          });

          // Send admin email notification
          if (userEmail) {
            console.log('[PAYMENT CONFIRM] Sending admin email notification...');
            sendAdminPoolJoinNotification({
              userName,
              userEmail,
              productTitle: pool.product.title,
              poolId: pool.id,
              quantity,
              amount,
              currency: currency || pool.product.baseCurrency,
              currentProgress: updatedPool.pledgedQty,
              targetQty: pool.targetQty,
            }).then(() => {
              console.log('[PAYMENT CONFIRM] ✅ Admin email sent');
            }).catch((err) => {
              console.error('[PAYMENT CONFIRM] ❌ Failed to send admin email notification:', err);
            });
          }

          // 4. Notify existing pool participants about the new joiner
          console.log('[PAYMENT CONFIRM] Notifying existing participants...');
          notifyExistingPoolParticipants({
            poolId: pool.id,
            productTitle: pool.product.title,
            newParticipantName: userName,
            currentQty: updatedPool.pledgedQty,
            targetQty: pool.targetQty,
            excludeUserId: session.sub,
          }).then((alerts) => {
            console.log('[PAYMENT CONFIRM] ✅ Existing participants notified:', alerts?.length || 0);
          }).catch((err) => {
            console.error('[PAYMENT CONFIRM] ❌ Failed to notify existing participants:', err);
          });

          // 5. Check if pool reached any milestones (50%, 90%, MOQ)
          console.log('[PAYMENT CONFIRM] Checking milestones...');
          checkAndUpdatePoolMilestone(pool.id).then(() => {
            console.log('[PAYMENT CONFIRM] ✅ Milestone check complete');
          }).catch((err) => {
            console.error('[PAYMENT CONFIRM] ❌ Failed to check pool milestone:', err);
          });
        } else {
          // Update existing payment status
          if (poolItem.payment && poolItem.payment.status === 'REQUIRES_ACTION') {
            await (prisma as any).payment.update({
              where: { id: poolItem.payment.id },
              data: {
                status: 'AUTHORIZED',
                reference: paymentIntentId,
                paidAt: new Date(),
              },
            });
            console.log(`Payment ${poolItem.payment.id} updated to AUTHORIZED`);

            // Update pool item status to PAYMENT_CONFIRMED
            await updatePoolItemStatus({
              poolItemId: poolItem.id,
              newStatus: 'PAYMENT_CONFIRMED',
              notes: `Payment confirmed via Stripe (${paymentIntentId})`,
              isAutomated: true,
            });

            // Create PAYMENT alert for user
            await createUserAlert({
              userId: session.sub,
              type: 'PAYMENT',
              title: 'Payment Confirmed ✅',
              body: `Your payment for ${pool.product.title} has been confirmed and held in escrow.`,
              link: `/account/orders/tracking`,
              poolId: pool.id,
              productName: pool.product.title,
            });
          }
        }
      } catch (paymentError) {
        console.error('Failed to process pool item:', paymentError);
        return NextResponse.json(
          { error: 'Failed to process payment' },
          { status: 500 }
        );
      }
    }

    // Create conversation for this order (use effectivePoolId which might have been looked up)
    if (effectivePoolId && prisma) {
      try {
        // Get pool and product details
        const pool = await (prisma as any).pool.findUnique({
          where: { id: effectivePoolId },
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
          
          // Create conversation and link it to the pool
          const conversation = await (prisma as any).conversation.create({
            data: {
              title: pool.product?.title || 'Your Pool Order',
              company: 'PoolBuy',
              avatarUrl: productImage,
              preview: `Your order for ${pool.product?.title || 'this product'} has been placed in escrow. We'll keep you updated!`,
              poolId: effectivePoolId, // Link conversation to pool
              updatedAt: new Date(),
              createdAt: new Date(),
            }
          });
          
          // Add user as participant
          await (prisma as any).conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              userId: session.sub,
            }
          });
          console.log('[PAYMENT CONFIRM] ✅ User added as conversation participant');
          
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
            console.log('[PAYMENT CONFIRM] ✅ Admin added as conversation participant');
            
            // Create initial admin message
            await (prisma as any).message.create({
              data: {
                conversationId: conversation.id,
                senderUserId: adminUser.id,
                sender: null,
                text: `Thank you for joining the pool for **${pool.product?.title || 'this product'}**! 🎉\n\nYour payment of ${amount?.toFixed(2) || ''} ${currency || 'USD'} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`,
              }
            });
            console.log('[PAYMENT CONFIRM] ✅ Initial welcome message created');
          }
          
          console.log('[PAYMENT CONFIRM] ✅ Conversation created successfully:', conversation.id);
        } else {
          console.log('[PAYMENT CONFIRM] ⚠️ Pool not found for conversation creation');
        }
      } catch (convError) {
        console.error('[PAYMENT CONFIRM] ❌ Failed to create conversation:', convError);
        // Don't fail the payment confirmation if conversation creation fails
      }
    } else {
      console.log('[PAYMENT CONFIRM] ⚠️ No effectivePoolId or prisma - skipping conversation creation');
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
