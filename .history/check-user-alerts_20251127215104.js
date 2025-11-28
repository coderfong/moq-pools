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

    console.log('✅ User found:', user.name, `(${user.email})`);
    console.log('\n📬 ALERTS:');
    console.log('━'.repeat(80));

    // Get all alerts for this user
    const alerts = await db.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (alerts.length === 0) {
      console.log('   No alerts found for this user');
    } else {
      alerts.forEach((alert, i) => {
        const statusIcon = alert.status === 'UNREAD' ? '🔴' : '✓';
        console.log(`\n${i + 1}. ${statusIcon} [${alert.type}] ${alert.title}`);
        console.log(`   ${alert.body}`);
        console.log(`   Link: ${alert.link || 'N/A'}`);
        console.log(`   Created: ${alert.createdAt.toLocaleString()}`);
        console.log(`   Status: ${alert.status}`);
        if (alert.productName) console.log(`   Product: ${alert.productName}`);
      });
    }

    // Get conversations
    console.log('\n\n💬 CONVERSATIONS:');
    console.log('━'.repeat(80));

    const conversations = await db.conversationParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              include: {
                senderUser: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    if (conversations.length === 0) {
      console.log('   No conversations found for this user');
    } else {
      conversations.forEach((conv, i) => {
        console.log(`\n${i + 1}. ${conv.conversation.title}`);
        console.log(`   Company: ${conv.conversation.company || 'N/A'}`);
        console.log(`   Updated: ${conv.conversation.updatedAt.toLocaleString()}`);
        console.log(`   Messages (last 3):`);
        conv.conversation.messages.forEach((msg, j) => {
          const senderName = msg.senderUser?.name || msg.sender || 'System';
          console.log(`     ${j + 1}. [${senderName}] ${msg.text.substring(0, 80)}...`);
          console.log(`        ${msg.createdAt.toLocaleString()}`);
        });
      });
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
        console.log(`   Created: ${item.createdAt.toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserAlerts();
