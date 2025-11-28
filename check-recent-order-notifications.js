const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkRecentOrder() {
  try {
    const userId = 'cmhjey0tq0000fp8f20ixj53g'; // jonny's user ID
    
    console.log('🔍 Checking most recent order notifications...\n');

    // Get the most recent order using raw SQL
    const orders = await db.$queryRaw`
      SELECT pi.*, p."targetQty", p."pledgedQty", pr."title" as "productTitle",
             pay."status" as "paymentStatus", pay."createdAt" as "paymentCreatedAt"
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

    const recentOrder = orders[0];

    console.log('📦 MOST RECENT ORDER:');
    console.log('━'.repeat(100));
    console.log(`Product: ${recentOrder.productTitle}`);
    console.log(`Quantity: ${recentOrder.quantity} units`);
    console.log(`Order Created: ${new Date(recentOrder.createdAt).toLocaleString()}`);
    console.log(`Pool ID: ${recentOrder.poolId}`);
    console.log(`Order ID: ${recentOrder.id}`);
    console.log(`Payment Status: ${recentOrder.paymentStatus || 'N/A'}`);
    console.log(`Pool Progress: ${recentOrder.pledgedQty}/${recentOrder.targetQty}`);

    // Check for alerts created around the same time (within 5 minutes)
    const orderTime = new Date(recentOrder.createdAt);
    const fiveMinutesAfter = new Date(orderTime.getTime() + 5 * 60 * 1000);
    const fiveMinutesBefore = new Date(orderTime.getTime() - 5 * 60 * 1000);

    const alertsNearOrderTime = await db.$queryRaw`
      SELECT * FROM "Alert" 
      WHERE "userId" = ${userId}
      AND "timestamp" >= ${fiveMinutesBefore}
      AND "timestamp" <= ${fiveMinutesAfter}
      ORDER BY "timestamp" DESC
    `;

    console.log(`\n📬 ALERTS CREATED FOR THIS ORDER (within ±5 min):`);
    console.log('━'.repeat(100));
    
    if (alertsNearOrderTime.length === 0) {
      console.log('❌ NO ALERTS FOUND!');
      console.log('\n⚠️  PROBLEM IDENTIFIED:');
      console.log('   The notification system did NOT create alerts when this order was placed.');
      console.log('   Expected alerts:');
      console.log('   - Welcome to the pool');
      console.log('   - Payment confirmed');
      console.log('   - Order placed in pool');
    } else {
      alertsNearOrderTime.forEach((alert, i) => {
        const statusIcon = alert.status === 'UNREAD' ? '🔴 UNREAD' : '✅ READ';
        console.log(`\n${i + 1}. ${statusIcon}`);
        console.log(`   Type: ${alert.type}`);
        console.log(`   Title: ${alert.title}`);
        console.log(`   Body: ${alert.body}`);
        console.log(`   Link: ${alert.link || 'N/A'}`);
        console.log(`   Created: ${new Date(alert.timestamp).toLocaleString()}`);
      });
    }

    // Check for conversations
    const conversations = await db.$queryRaw`
      SELECT c.* FROM "Conversation" c
      JOIN "ConversationParticipant" cp ON c.id = cp."conversationId"
      WHERE cp."userId" = ${userId}
      AND c."createdAt" >= ${fiveMinutesBefore}
      AND c."createdAt" <= ${fiveMinutesAfter}
    `;

    console.log(`\n\n💬 CONVERSATIONS CREATED FOR THIS ORDER:`);
    console.log('━'.repeat(100));
    
    if (conversations.length === 0) {
      console.log('❌ NO CONVERSATIONS FOUND!');
      console.log('\n⚠️  PROBLEM IDENTIFIED:');
      console.log('   The messaging system did NOT create a conversation for this order.');
    } else {
      conversations.forEach((conv, i) => {
        console.log(`\n${i + 1}. ${conv.title}`);
        console.log(`   Company: ${conv.company || 'N/A'}`);
        console.log(`   Created: ${new Date(conv.createdAt).toLocaleString()}`);
      });
    }

    // Check payment record
    console.log(`\n\n💳 PAYMENT INFO:`);
    console.log('━'.repeat(100));
    console.log(`Status: ${recentOrder.paymentStatus || 'N/A'}`);
    console.log(`Payment Created: ${recentOrder.paymentCreatedAt ? new Date(recentOrder.paymentCreatedAt).toLocaleString() : 'N/A'}`);
    
    console.log(`\n\n🔍 DIAGNOSIS:`);
    console.log('━'.repeat(100));
    if (alertsNearOrderTime.length === 0) {
      console.log('❌ NOTIFICATION SYSTEM FAILURE');
      console.log('   The /api/payment/confirm route may not be executing properly.');
      console.log('   OR the createUserAlert function is silently failing.');
      console.log('\n💡 SOLUTION: Add explicit notification creation or check API logs.');
    } else {
      console.log('✅ Notifications are working correctly');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkRecentOrder();
