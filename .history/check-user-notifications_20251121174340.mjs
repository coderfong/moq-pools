/**
 * Check user notifications and authentication status
 * Run: node check-user-notifications.mjs [email]
 */

import { PrismaClient } from './prisma/generated/client4/index.js';

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    const targetEmail = process.argv[2] || 'agarioplayersg123@gmail.com';
    
    console.log('='.repeat(60));
    console.log('🔍 NOTIFICATION STATUS CHECK');
    console.log('='.repeat(60));
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    
    if (!user) {
      console.log(`\n❌ User not found: ${targetEmail}`);
      console.log('\nAvailable users:');
      const users = await prisma.user.findMany({
        select: { email: true, name: true },
        take: 5,
      });
      users.forEach(u => console.log(`  - ${u.email} (${u.name || 'No name'})`));
      return;
    }
    
    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    
    // Check notifications (alerts)
    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    
    console.log(`\n📬 Notifications: ${alerts.length} total`);
    
    if (alerts.length === 0) {
      console.log('\n⚠️  No notifications found for this user.');
      console.log('   Run: node test-notifications.mjs ' + targetEmail);
      return;
    }
    
    const unread = alerts.filter(a => a.status === 'UNREAD').length;
    console.log(`   📨 Unread: ${unread}`);
    console.log(`   ✅ Read: ${alerts.length - unread}`);
    
    console.log('\n📋 Recent notifications:');
    alerts.slice(0, 5).forEach((alert, i) => {
      const statusIcon = alert.status === 'UNREAD' ? '🔵' : '⚪';
      console.log(`\n   ${statusIcon} #${i + 1} [${alert.type}]`);
      console.log(`      Title: ${alert.title}`);
      console.log(`      Body: ${alert.body}`);
      console.log(`      Status: ${alert.status}`);
      console.log(`      Time: ${alert.timestamp.toLocaleString()}`);
      if (alert.link) {
        console.log(`      Link: ${alert.link}`);
      }
    });
    
    // Check session (skip if table doesn't exist)
    console.log('\n🔐 Checking authentication...');
    let hasActiveSessions = false;
    try {
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { expires: 'desc' },
        take: 3,
      });
      
      if (sessions.length === 0) {
        console.log('   ⚠️  No active sessions found');
      } else {
        const activeSessions = sessions.filter(s => s.expires > new Date());
        console.log(`   Sessions found: ${sessions.length} total, ${activeSessions.length} active`);
        hasActiveSessions = activeSessions.length > 0;
        
        if (hasActiveSessions) {
          activeSessions.forEach((session, i) => {
            console.log(`   ✅ Active Session ${i + 1} expires: ${session.expires.toLocaleString()}`);
          });
        } else {
          console.log('   ⚠️  All sessions expired');
        }
      }
    } catch (error) {
      console.log('   ℹ️  Session table not available (using alternative auth)');
      hasActiveSessions = false; // Assume not logged in if we can't check
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 NEXT STEPS:');
    console.log('='.repeat(60));
    
    if (!hasActiveSessions) {
      console.log('1. ⚠️  You need to LOG IN to see notifications');
      console.log('2. 🔐 Go to: http://localhost:3007/login');
      console.log(`3. 📧 Use email: ${targetEmail}`);
      console.log('4. 🔑 Enter your password (or use OAuth)');
      console.log('5. 🔄 After login, check the notification bell icon 🔔');
      console.log(`6. 📬 You should see ${unread} unread notification(s)`);
    } else {
      console.log('1. ✅ You have an active session');
      console.log('2. 🔄 Refresh your browser at: http://localhost:3007');
      console.log('3. 🔔 Check the notification bell icon in the navbar');
      console.log(`4. 📬 You should see ${unread} unread notification(s)`);
      console.log('\nℹ️  If you still see 401 errors:');
      console.log('   - Clear browser cookies and log in again');
      console.log('   - Check browser console for errors');
    }
    
    console.log('\n📝 To create more test notifications:');
    console.log(`   node test-notifications.mjs ${targetEmail}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
