/**
 * Notification utilities for creating and broadcasting notifications
 */

import { prisma } from '@/lib/prisma';
import { AlertType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: AlertType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Create a notification in the database and broadcast via WebSocket
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Create notification in database
    const notification = await prisma.alert.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        status: 'UNREAD',
      },
    });

    // Broadcast via WebSocket
    await broadcastToUser(params.userId, {
      type: 'NOTIFICATION',
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.body,
        link: notification.link,
        timestamp: notification.timestamp.toISOString(),
      },
      timestamp: Date.now(),
    });

    console.log(`✅ Notification created for user ${params.userId}: ${params.title}`);
    return notification;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
}

/**
 * Broadcast notification to specific user via WebSocket
 */
async function broadcastToUser(userId: string, message: any) {
  try {
    const wsPort = process.env.WS_PORT || 8080;
    await fetch(`http://localhost:${wsPort}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message,
      }),
    });
  } catch (error) {
    console.error('❌ Failed to broadcast to user:', error);
    // Don't throw - notification was still created in DB
  }
}

/**
 * Create pool update notification for pool participants
 */
export async function notifyPoolUpdate(
  poolId: string,
  userIds: string[],
  pledgedQty: number,
  targetQty: number
) {
  const progress = Math.round((pledgedQty / targetQty) * 100);
  
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: 'GROUP_UPDATE',
      title: 'Pool Progress Update',
      body: `Your pool has reached ${progress}% of its goal (${pledgedQty}/${targetQty} units)`,
      link: `/pools/${poolId}`,
    });
  }
}

/**
 * Create pool closed notification
 */
export async function notifyPoolClosed(poolId: string, userIds: string[]) {
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: 'GROUP_UPDATE',
      title: 'Pool Closed - MOQ Reached!',
      body: 'Your pool has reached its minimum order quantity. Orders will be processed soon.',
      link: `/pools/${poolId}`,
    });
  }
}

/**
 * Create shipping notification
 */
export async function notifyShipping(userId: string, orderId: string, trackingNumber: string) {
  await createNotification({
    userId,
    type: 'SHIPPING',
    title: 'Your Order Has Shipped!',
    body: `Tracking number: ${trackingNumber}`,
    link: `/orders/${orderId}`,
  });
}

/**
 * Create promotion notification
 */
export async function notifyPromotion(userId: string, title: string, message: string, link?: string) {
  await createNotification({
    userId,
    type: 'PROMOTION',
    title,
    body: message,
    link,
  });
}
