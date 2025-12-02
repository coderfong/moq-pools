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
    await db.$executeRaw`
      INSERT INTO "Alert" ("id", "userId", "type", "title", "body", "link", "status", "triageStatus", "priority", "poolId", "productName", "timestamp", "updatedAt")
      VALUES (gen_random_uuid()::text, ${userId}, 'GROUP_UPDATE', 
        ${`Welcome to the pool for ${order.productTitle}!`},
        ${`Your payment of ${order.amount.toFixed(2)} ${order.currency} is now held securely in escrow. Pool progress: ${order.pledgedQty}/${order.targetQty} units.`},
        ${`/pools/${order.poolId}`}, 'UNREAD', 'OPEN', false, ${order.poolId}, ${order.productTitle}, NOW(), NOW())
    `;
    console.log('✅ Welcome alert created');

    // 2. Payment confirmed alert
    await db.$executeRaw`
      INSERT INTO "Alert" ("id", "userId", "type", "title", "body", "link", "status", "triageStatus", "priority", "poolId", "productName", "timestamp", "updatedAt")
      VALUES (gen_random_uuid()::text, ${userId}, 'PAYMENT',
        'Payment Confirmed ✅',
        ${`Your payment for ${order.productTitle} has been confirmed and held in escrow.`},
        '/account/orders/tracking', 'UNREAD', 'OPEN', false, ${order.poolId}, ${order.productTitle}, NOW(), NOW())
    `;
    console.log('✅ Payment alert created');

    // 3. Order placed alert
    await db.$executeRaw`
      INSERT INTO "Alert" ("id", "userId", "type", "title", "body", "link", "status", "triageStatus", "priority", "poolId", "productName", "timestamp", "updatedAt")
      VALUES (gen_random_uuid()::text, ${userId}, 'ORDER',
        'Order Placed in Pool 🎉',
        ${`You've successfully joined the pool for ${order.productTitle}. We'll notify you when the MOQ is reached!`},
        ${`/pools/${order.poolId}`}, 'UNREAD', 'OPEN', false, ${order.poolId}, ${order.productTitle}, NOW(), NOW())
    `;
    console.log('✅ Order alert created');

    console.log('\n💬 Creating conversation...\n');

    // Check if conversation already exists for this pool with this user
    const existingConv = await db.$queryRaw`
      SELECT c.* FROM "Conversation" c
      JOIN "ConversationParticipant" cp ON c.id = cp."conversationId"
      WHERE c."poolId" = ${order.poolId}
      AND cp."userId" = ${userId}
      LIMIT 1
    `;

    if (existingConv.length > 0) {
      console.log('ℹ️  Conversation already exists:', existingConv[0].id);
    } else {
      // Get product and admin details
      const poolData = await db.$queryRaw`
        SELECT pr."imagesJson", pr.title
        FROM "Pool" p
        JOIN "Product" pr ON pr.id = p."productId"
        WHERE p.id = ${order.poolId}
      `;

      let productImage = null;
      if (poolData[0]?.imagesJson) {
        try {
          const images = JSON.parse(poolData[0].imagesJson);
          productImage = Array.isArray(images) && images[0] ? String(images[0]) : null;
        } catch {}
      }

      // Create conversation with raw SQL
      const convId = await db.$queryRaw`
        INSERT INTO "Conversation" ("id", "title", "company", "avatarUrl", "preview", "poolId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${order.productTitle}, 'MOQPools', ${productImage},
          ${`Your order for ${order.productTitle} has been placed in escrow. We'll keep you updated!`},
          ${order.poolId}, NOW(), NOW())
        RETURNING id
      `;
      
      const conversationId = convId[0].id;
      console.log('✅ Conversation created:', conversationId);

      // Add user as participant
      await db.$executeRaw`
        INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt")
        VALUES (gen_random_uuid()::text, ${conversationId}, ${userId}, NOW())
      `;
      console.log('✅ User added as participant');

      // Add admin as participant
      const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      if (adminUser) {
        await db.$executeRaw`
          INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt")
          VALUES (gen_random_uuid()::text, ${conversationId}, ${adminUser.id}, NOW())
        `;
        console.log('✅ Admin added as participant');

        // Create initial message
        await db.$executeRaw`
          INSERT INTO "Message" ("id", "conversationId", "senderUserId", "text", "createdAt")
          VALUES (gen_random_uuid()::text, ${conversationId}, ${adminUser.id},
            ${`Thank you for joining the pool for **${order.productTitle}**! 🎉\n\nYour payment of ${order.amount.toFixed(2)} ${order.currency} is now held securely in escrow. We'll keep you updated as the pool progresses toward its MOQ.\n\nFeel free to ask any questions here!`},
            NOW())
        `;
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
