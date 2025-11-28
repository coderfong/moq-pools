const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkAllUsersWithOrders() {
  try {
    console.log('🔍 Finding all users with pool orders...\n');

    // Get all pool items with user info
    const poolItems = await db.poolItem.findMany({
      include: {
        user: {
          select: { 
            id: true, 
            email: true, 
            name: true,
            role: true 
          }
        },
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
      console.log('❌ No pool orders found in the system');
      return;
    }

    console.log(`Found ${poolItems.length} orders from ${new Set(poolItems.map(p => p.userId)).size} unique users\n`);
    console.log('━'.repeat(100));

    // Group by user
    const userOrders = {};
    poolItems.forEach(item => {
      if (!userOrders[item.userId]) {
        userOrders[item.userId] = {
          user: item.user,
          orders: []
        };
      }
      userOrders[item.userId].orders.push(item);
    });

    // Check each user's notifications
    for (const [userId, data] of Object.entries(userOrders)) {
      const user = data.user;
      const orders = data.orders;
      
      console.log(`\n👤 USER: ${user.name || 'N/A'} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${userId}`);
      console.log(`   Orders: ${orders.length}`);
      
      // Show orders
      orders.forEach((order, i) => {
        console.log(`   ${i + 1}. ${order.pool.product.title} - ${order.quantity} units (${new Date(order.createdAt).toLocaleString()})`);
      });

      // Check alerts using raw SQL with correct column name
      const alerts = await db.$queryRaw`
        SELECT * FROM "Alert" 
        WHERE "userId" = ${userId}
        ORDER BY "timestamp" DESC 
        LIMIT 10
      `;

      console.log(`\n   📬 ALERTS: ${alerts.length}`);
      if (alerts.length === 0) {
        console.log(`      ❌ NO ALERTS FOUND - Notifications were NOT created!`);
      } else {
        alerts.forEach((alert, i) => {
          const statusIcon = alert.status === 'UNREAD' ? '🔴' : '✅';
          console.log(`      ${i + 1}. ${statusIcon} [${alert.type}] ${alert.title}`);
          console.log(`         Created: ${new Date(alert.timestamp).toLocaleString()}`);
        });
      }

      // Check conversations
      const conversations = await db.$queryRaw`
        SELECT c.*, cp."userId"
        FROM "ConversationParticipant" cp
        JOIN "Conversation" c ON c.id = cp."conversationId"
        WHERE cp."userId" = ${userId}
      `;

      console.log(`\n   💬 CONVERSATIONS: ${conversations.length}`);
      if (conversations.length === 0) {
        console.log(`      ❌ NO CONVERSATIONS FOUND - Messages were NOT created!`);
      } else {
        conversations.forEach((conv, i) => {
          console.log(`      ${i + 1}. ${conv.title} (${conv.company || 'N/A'})`);
        });
      }

      console.log('\n' + '━'.repeat(100));
    }

    console.log('\n\n📊 SUMMARY:');
    console.log('━'.repeat(100));
    
    const totalUsers = Object.keys(userOrders).length;
    let usersWithAlerts = 0;
    let usersWithConversations = 0;
    
    for (const userId of Object.keys(userOrders)) {
      const alerts = await db.$queryRaw`SELECT COUNT(*) as count FROM "Alert" WHERE "userId" = ${userId}`;
      const convs = await db.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "ConversationParticipant" 
        WHERE "userId" = ${userId}
      `;
      
      if (parseInt(alerts[0].count) > 0) usersWithAlerts++;
      if (parseInt(convs[0].count) > 0) usersWithConversations++;
    }

    console.log(`Total users with orders: ${totalUsers}`);
    console.log(`Users with alerts: ${usersWithAlerts}/${totalUsers}`);
    console.log(`Users with conversations: ${usersWithConversations}/${totalUsers}`);
    
    if (usersWithAlerts < totalUsers) {
      console.log(`\n⚠️  WARNING: ${totalUsers - usersWithAlerts} user(s) have orders but NO alerts!`);
      console.log('   The notification system is NOT working properly for these users.');
    }
    
    if (usersWithConversations < totalUsers) {
      console.log(`\n⚠️  WARNING: ${totalUsers - usersWithConversations} user(s) have orders but NO conversations!`);
      console.log('   The messaging system is NOT working properly for these users.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkAllUsersWithOrders();
