/**
 * Test script to create sample notifications
 * Run: node test-notifications.mjs
 */

import { PrismaClient } from './prisma/generated/client4/index.js';

const prisma = new PrismaClient();

// Try to use WebSocket notification if available
async function broadcastNotification(userId, notification) {
  try {
    if (global.broadcastNotification) {
      global.broadcastNotification(userId, notification);
      console.log('📡 Broadcasted notification via WebSocket');
    } else {
      console.log('ℹ️ WebSocket server not running - notification saved to database only');
    }
  } catch (error) {
    console.log('⚠️ Could not broadcast via WebSocket:', error.message);
  }
}

async function createTestNotifications() {
  try {
    // Get email from command line argument or use first user
    const targetEmail = process.argv[2];
    
    let user;
    if (targetEmail) {
      user = await prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true, email: true },
      });
      if (!user) {
        console.log(`❌ User not found: ${targetEmail}`);
        return;
      }
    } else {
      // Find first user - only select fields we need
      user = await prisma.user.findFirst({
        select: { id: true, email: true },
      });
      if (!user) {
        console.log('❌ No users found. Please create a user first.');
        return;
      }
    }

    console.log(`Creating test notifications for user: ${user.email}`);

    // Create test notifications
    const notification1 = await prisma.alert.create({
      data: {
        userId: user.id,
        type: 'GROUP_UPDATE',
        title: 'Pool Progress Update',
        body: 'The Mechanical Keyboard pool has reached 75% of its goal!',
        link: '/pools/test-pool-1',
        status: 'UNREAD',
      },
    });
    await broadcastNotification(user.id, notification1);

    const notification2 = await prisma.alert.create({
      data: {
        userId: user.id,
        type: 'GROUP_UPDATE',
        title: 'Pool Closed - MOQ Reached!',
        body: 'LED Strip Lights pool has reached minimum order quantity',
        link: '/pools/test-pool-2',
        status: 'UNREAD',
      },
    });
    await broadcastNotification(user.id, notification2);

    const notification3 = await prisma.alert.create({
      data: {
        userId: user.id,
        type: 'PROMOTION',
        title: 'New Pool Available',
        body: 'Check out the new Smart Watch pool with 30% discount',
        link: '/pools/test-pool-3',
        status: 'UNREAD',
      },
    });
    await broadcastNotification(user.id, notification3);

    console.log('✅ Created 3 test notifications successfully!');
    console.log('Log in and check the notification bell in the navbar.');
  } catch (error) {
    console.error('❌ Error creating notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
