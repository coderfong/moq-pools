/**
 * Check notifications in database
 * Run: node check-notifications.mjs YOUR_EMAIL
 */

import { PrismaClient } from './prisma/generated/client4/index.js';

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    const email = process.argv[2] || 'agarioplayersg123@gmail.com';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    console.log('');

    // Get notifications
    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        status: true,
        timestamp: true,
      },
    });

    console.log(`📬 Found ${alerts.length} notifications:`);
    console.log('');
    
    alerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.status === 'UNREAD' ? '🔴' : '✅'} ${alert.title}`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Message: ${alert.body}`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Created: ${alert.timestamp.toLocaleString()}`);
      console.log('');
    });

    const unreadCount = alerts.filter(a => a.status === 'UNREAD').length;
    console.log(`📊 Summary: ${alerts.length} total, ${unreadCount} unread`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
