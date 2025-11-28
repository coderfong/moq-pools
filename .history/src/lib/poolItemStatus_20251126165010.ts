import { prisma } from './prisma';
import { createUserAlert } from './notifications';

/**
 * Pool item status lifecycle helper
 * Manages status transitions with history tracking and notifications
 */

export type PoolItemStatus = 
  | 'JOINING'
  | 'POOL_ACTIVE'
  | 'MOQ_REACHED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PLACED'
  | 'PREPARING_SHIPMENT'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

interface UpdatePoolItemStatusParams {
  poolItemId: string;
  newStatus: PoolItemStatus;
  notes?: string;
  automated?: boolean;
  triggeredById?: string;
  sendNotification?: boolean;
}

/**
 * Update pool item status with history tracking and optional notifications
 */
export async function updatePoolItemStatus(params: UpdatePoolItemStatusParams) {
  const { 
    poolItemId, 
    newStatus, 
    notes, 
    automated = true, 
    triggeredById,
    sendNotification = true 
  } = params;

  if (!prisma) {
    console.error('Prisma not available');
    return null;
  }

  try {
    // Fetch current pool item with related data
    const poolItem = await (prisma as any).poolItem.findUnique({
      where: { id: poolItemId },
      include: {
        pool: {
          include: {
            product: {
              select: { id: true, title: true }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (!poolItem) {
      console.error('Pool item not found:', poolItemId);
      return null;
    }

    const oldStatus = poolItem.poolItemStatus;

    // Skip if already in this status
    if (oldStatus === newStatus) {
      return poolItem;
    }

    // Update pool item status
    const updated = await (prisma as any).poolItem.update({
      where: { id: poolItemId },
      data: { poolItemStatus: newStatus }
    });

    // Create status history entry
    await (prisma as any).poolItemStatusHistory.create({
      data: {
        poolItemId,
        fromStatus: oldStatus,
        toStatus: newStatus,
        notes,
        automated,
        triggeredById
      }
    });

    // Send notification if enabled
    if (sendNotification && poolItem.user) {
      const { title, body, alertType } = getStatusNotification(
        newStatus,
        poolItem.pool?.product?.title || 'Product'
      );

      if (title && body) {
        await createUserAlert({
          userId: poolItem.user.id,
          type: alertType,
          title,
          body,
          link: `/account/orders/tracking?item=${poolItemId}`,
          priority: ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(newStatus),
          poolId: poolItem.poolId,
          productName: poolItem.pool?.product?.title
        });
      }
    }

    console.log(`Pool item ${poolItemId} status updated: ${oldStatus} → ${newStatus}`);
    return updated;
  } catch (error) {
    console.error('Failed to update pool item status:', error);
    return null;
  }
}

/**
 * Get notification content for status changes
 */
function getStatusNotification(status: PoolItemStatus, productTitle: string): {
  title: string;
  body: string;
  alertType: 'GROUP_UPDATE' | 'PAYMENT' | 'ORDER' | 'SHIPPING';
} {
  const alerts: Record<PoolItemStatus, { title: string; body: string; alertType: any }> = {
    JOINING: {
      title: '🎉 Welcome to the pool!',
      body: `You've joined the pool for ${productTitle}. We'll notify you when the MOQ is reached.`,
      alertType: 'GROUP_UPDATE'
    },
    POOL_ACTIVE: {
      title: '👥 Pool is active',
      body: `The pool for ${productTitle} is gaining momentum. Invite friends to reach MOQ faster!`,
      alertType: 'GROUP_UPDATE'
    },
    MOQ_REACHED: {
      title: '🎯 MOQ Reached!',
      body: `Great news! The pool for ${productTitle} has reached MOQ. Payment capture in progress...`,
      alertType: 'GROUP_UPDATE'
    },
    PAYMENT_PENDING: {
      title: '💳 Payment Processing',
      body: `We're processing your payment for ${productTitle}. This usually takes a few moments.`,
      alertType: 'PAYMENT'
    },
    PAYMENT_CONFIRMED: {
      title: '✅ Payment Confirmed',
      body: `Your payment for ${productTitle} has been confirmed. Order will be placed with supplier soon.`,
      alertType: 'PAYMENT'
    },
    ORDER_PLACED: {
      title: '📋 Order Placed',
      body: `Your order for ${productTitle} has been placed with the supplier. Preparing for shipment...`,
      alertType: 'ORDER'
    },
    PREPARING_SHIPMENT: {
      title: '📦 Preparing Shipment',
      body: `Your ${productTitle} is being prepared for shipment. Expect shipping updates within 2-3 days.`,
      alertType: 'SHIPPING'
    },
    IN_TRANSIT: {
      title: '🚚 Package In Transit',
      body: `Your ${productTitle} is on its way! Track your shipment for real-time updates.`,
      alertType: 'SHIPPING'
    },
    OUT_FOR_DELIVERY: {
      title: '🏃 Out for Delivery',
      body: `Your ${productTitle} is out for delivery today! Please be available to receive it.`,
      alertType: 'SHIPPING'
    },
    DELIVERED: {
      title: '🎉 Package Delivered!',
      body: `Your ${productTitle} has been delivered. Enjoy your purchase and please leave a review!`,
      alertType: 'SHIPPING'
    },
    CANCELLED: {
      title: '❌ Order Cancelled',
      body: `Your order for ${productTitle} has been cancelled. If you have questions, contact support.`,
      alertType: 'ORDER'
    },
    REFUNDED: {
      title: '💰 Refund Processed',
      body: `Your refund for ${productTitle} has been processed. Funds should appear in 5-10 business days.`,
      alertType: 'PAYMENT'
    }
  };

  return alerts[status] || {
    title: 'Order Update',
    body: `Status update for ${productTitle}`,
    alertType: 'ORDER'
  };
}

/**
 * Batch update multiple pool items to the same status
 * Useful for bulk operations like "mark all items in pool as ORDER_PLACED"
 */
export async function batchUpdatePoolItemStatus(
  poolItemIds: string[],
  newStatus: PoolItemStatus,
  notes?: string,
  triggeredById?: string
) {
  if (!prisma) return [];

  const results = await Promise.all(
    poolItemIds.map(id =>
      updatePoolItemStatus({
        poolItemId: id,
        newStatus,
        notes,
        automated: false,
        triggeredById,
        sendNotification: true
      })
    )
  );

  return results.filter(Boolean);
}

/**
 * Get status history for a pool item
 */
export async function getPoolItemStatusHistory(poolItemId: string) {
  if (!prisma) return [];

  try {
    const history = await (prisma as any).poolItemStatusHistory.findMany({
      where: { poolItemId },
      include: {
        triggeredBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return history;
  } catch (error) {
    console.error('Failed to get status history:', error);
    return [];
  }
}

/**
 * Get status label and styling info
 */
export function getStatusDisplay(status: PoolItemStatus): {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  progress: number; // 0-100
} {
  const displays: Record<PoolItemStatus, any> = {
    JOINING: {
      label: 'Joining Pool',
      icon: '👋',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      progress: 10
    },
    POOL_ACTIVE: {
      label: 'Pool Active',
      icon: '👥',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      progress: 25
    },
    MOQ_REACHED: {
      label: 'MOQ Reached',
      icon: '🎯',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      progress: 35
    },
    PAYMENT_PENDING: {
      label: 'Payment Pending',
      icon: '⏳',
      color: 'amber',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      progress: 40
    },
    PAYMENT_CONFIRMED: {
      label: 'Payment Confirmed',
      icon: '✅',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      progress: 50
    },
    ORDER_PLACED: {
      label: 'Order Placed',
      icon: '📋',
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      progress: 60
    },
    PREPARING_SHIPMENT: {
      label: 'Preparing Shipment',
      icon: '📦',
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      progress: 70
    },
    IN_TRANSIT: {
      label: 'In Transit',
      icon: '🚚',
      color: 'cyan',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      progress: 85
    },
    OUT_FOR_DELIVERY: {
      label: 'Out for Delivery',
      icon: '🏃',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      progress: 95
    },
    DELIVERED: {
      label: 'Delivered',
      icon: '🎉',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      progress: 100
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: '❌',
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      progress: 0
    },
    REFUNDED: {
      label: 'Refunded',
      icon: '💰',
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      progress: 0
    }
  };

  return displays[status] || {
    label: status,
    icon: '📦',
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    progress: 0
  };
}
