const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function createMissingNotifications() {
  try {
    const userId = 'cmhjey0tq0000fp8f20ixj53g'; // jonny's user ID
    
    console.log('🔧 Creating missing notifications for recent order...\n');

    // Get the most recent order
    const orders = await db.$queryRaw`
      SELECT pi.*, p.id as "poolId", p."targetQty", p."pledgedQty", pr.title as "productTitle",
             pay.amount, pay.currency
      FROM "PoolItem" pi
      JOIN "Pool" p ON p.id = pi."poolId"
      JOIN "Product" pr ON pr.id = p."productId"
      LEFT JOIN "Payment" pay ON pay."poolItemId" = pi.id
      WHERE pi."userId" = ${userId}
      ORDER BY pi."createdAt" DESC
      LIMIT 1
    `;

    if (orders.length === 0) {
      console.log('❌ No orders found');
      return;
    }

    const order = orders[0];
    console.log('📦 Order:', order.productTitle);
    console.log('   Quantity:', order.quantity);
    console.log('   Pool Progress:', order.pledgedQty, '/', order.targetQty);

    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    console.log('\n✨ Creating alerts...\n');

    // 1. Welcome alert
    const welcomeAlert = await db.alert.create({
      data: {
        userId: userId,
        type: 'GROUP_UPDATE',
        title: `Welcome to the pool for ${order.productTitle}!`,
        body: `Your payment of ${order.amount.toFixed(2)} ${order.currency} is now held securely in escrow. Pool progress: ${order.pledgedQty}/${order.targetQty} units.`,
        link: `/pools/${order.poolId}`,
        status: 'UNREAD',
        triageStatus: 'OPEN',
        priority: false,
        poolId: order.poolId,
        productName: order.productTitle,
      },
    });
    console.log('✅ Welcome alert created:', welcomeAlert.id);

    // 2. Payment confirmed alert
    const paymentAlert = await db.alert.create({
      data: {
        userId: userId,
        type: 'PAYMENT',
        title: 'Payment Confirmed ✅',
        body: `Your payment for ${order.productTitle} has been confirmed and held in escrow.`,
        link: `/account/orders/tracking`,
        status: 'UNREAD',
        triageStatus: 'OPEN',
        priority: false,
        poolId: order.poolId,
        productName: order.productTitle,
      },
    });
    console.log('✅ Payment alert created:', paymentAlert.id);

    // 3. Order placed alert
    const orderAlert = await db.alert.create({
      data: {
        userId: userId,
        type: 'ORDER',
        title: 'Order Placed in Pool 🎉',
        body: `You've successfully joined the pool for ${order.productTitle}. We'll notify you when the MOQ is reached!`,
        link: `/pools/${order.poolId}`,
        status: 'UNREAD',
        triageStatus: 'OPEN',
        priority: false,
        poolId: order.poolId,
        productName: order.productTitle,
      },
    });
    console.log('✅ Order alert created:', orderAlert.id);

    console.log('\n💬 Creating conversation...\n');

    // Check if conversation already exists for this pool
    let conversation = await db.conversation.findFirst({
      where: {
        poolId: order.poolId,
        participants: { some: { userId: userId } }
      }
    });

    if (conversation) {
      console.log('ℹ️  Conversation already exists:', conversation.id);
    } else {
      // Get product image
      const product = await db.product.findFirst({
        where: { id: await db.$queryRaw`SELECT "productId" FROM "Pool" WHERE id = ${order.poolId}`.then(r => r[0]?.productId) },
        select: { imagesJson: true }
      });

      let productImage = null;
      if (product?.imagesJson) {
        try {
          const images = JSON.parse(product.imagesJson);
          productImage = Array.isArray(images) && images[0] ? String(images[0]) : null;
        } catch {}
      }

      // Create conversation
      conversation = await db.conversation.create({
        data: {
          title: order.productTitle,
          company: 'PoolBuy',
          avatarUrl: productImage,
          preview: `Your order for ${order.productTitle} has been placed in escrow. We'll keep you updated!`,
          poolId: order.poolId,
        }
      });
      console.log('✅ Conversation created:', conversation.id);

      // Add user as participant
      await db.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: userId,
        }
      });
      console.log('✅ User added as participant');

      // Add admin as participant
      const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      if (adminUser) {
        await db.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId: adminUser.id,
          }
        });
        console.log('✅ Admin added as participant');

        // Create initial message
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderUserId: adminUser.id,
            text: `Thank you for joining the pool for **${order.productTitle}**! 🎉\n\nYour payment of ${order.amount.toFixed(2)} ${order.currency} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`,
          }
        });
        console.log('✅ Welcome message created');
      }
    }

    console.log('\n\n✅ DONE! Check:');
    console.log('   📬 Alerts: http://localhost:3007/account/notifications');
    console.log('   💬 Messages: http://localhost:3007/account/messages');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

createMissingNotifications();
