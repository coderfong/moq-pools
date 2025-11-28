const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkUserAlerts() {
  try {
    // Get your user ID (replace with your email)
    const userEmail = process.argv[2] || 'jonfong78@gmail.com';
    
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      console.log('❌ User not found:', userEmail);
      return;
    }

    console.log('✅ User found:', user.name || 'N/A', `(${user.email})`);
    console.log('\n📬 ALERTS:');
    console.log('━'.repeat(80));

    // Use raw SQL query since Alert model might not be in current Prisma client
    const alerts = await db.$queryRaw`
      SELECT * FROM "Alert" 
      WHERE "userId" = ${user.id} 
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `;

    if (alerts.length === 0) {
      console.log('   ❌ No alerts found for this user');
      console.log('   This means notifications were NOT created when you joined the pool.');
    } else {
      alerts.forEach((alert, i) => {
        const statusIcon = alert.status === 'UNREAD' ? '🔴' : '✅';
        console.log(`\n${i + 1}. ${statusIcon} [${alert.type}] ${alert.title}`);
        console.log(`   ${alert.body}`);
        console.log(`   Link: ${alert.link || 'N/A'}`);
        console.log(`   Created: ${new Date(alert.createdAt).toLocaleString()}`);
        console.log(`   Status: ${alert.status}`);
        if (alert.productName) console.log(`   Product: ${alert.productName}`);
      });
    }

    // Get conversations using raw SQL
    console.log('\n\n💬 CONVERSATIONS:');
    console.log('━'.repeat(80));

    const conversations = await db.$queryRaw`
      SELECT c.*, cp."userId"
      FROM "ConversationParticipant" cp
      JOIN "Conversation" c ON c.id = cp."conversationId"
      WHERE cp."userId" = ${user.id}
      ORDER BY c."updatedAt" DESC
    `;

    if (conversations.length === 0) {
      console.log('   ❌ No conversations found for this user');
      console.log('   This means the conversation was NOT created when you joined the pool.');
    } else {
      for (const conv of conversations) {
        console.log(`\n${conversations.indexOf(conv) + 1}. ${conv.title}`);
        console.log(`   Company: ${conv.company || 'N/A'}`);
        console.log(`   Updated: ${new Date(conv.updatedAt).toLocaleString()}`);
        
        // Get messages for this conversation
        const messages = await db.$queryRaw`
          SELECT m.*, u.name as "senderName"
          FROM "Message" m
          LEFT JOIN "User" u ON u.id = m."senderUserId"
          WHERE m."conversationId" = ${conv.id}
          ORDER BY m."createdAt" DESC
          LIMIT 3
        `;
        
        console.log(`   Messages (last 3):`);
        messages.forEach((msg, j) => {
          const senderName = msg.senderName || msg.sender || 'System';
          console.log(`     ${j + 1}. [${senderName}] ${msg.text.substring(0, 80)}...`);
          console.log(`        ${new Date(msg.createdAt).toLocaleString()}`);
        });
      }
    }

    // Get pool items (orders)
    console.log('\n\n📦 ORDERS:');
    console.log('━'.repeat(80));

    const poolItems = await db.poolItem.findMany({
      where: { userId: user.id },
      include: {
        pool: {
          include: {
            product: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (poolItems.length === 0) {
      console.log('   No orders found for this user');
    } else {
      poolItems.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.pool.product.title}`);
        console.log(`   Quantity: ${item.quantity} units`);
        console.log(`   Pool: ${item.pool.pledgedQty}/${item.pool.targetQty} units`);
        console.log(`   Pool ID: ${item.poolId}`);
        console.log(`   Created: ${item.createdAt.toLocaleString()}`);
      });
    }

    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('━'.repeat(80));
    console.log(`   Alerts: ${alerts.length}`);
    console.log(`   Conversations: ${conversations.length}`);
    console.log(`   Orders: ${poolItems.length}`);
    
    if (alerts.length === 0 && poolItems.length > 0) {
      console.log('\n⚠️  WARNING: You have orders but NO alerts!');
      console.log('   This indicates the notification system is not working properly.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUserAlerts();
