import { prisma } from './prisma';

// Notification icons and colors mapping
export const NOTIFICATION_CONFIG = {
  GROUP_UPDATE: {
    icon: '👥',
    color: '#3b82f6', // blue
  },
  SHIPPING: {
    icon: '📦',
    color: '#8b5cf6', // purple
  },
  PROMOTION: {
    icon: '🎉',
    color: '#f59e0b', // amber
  },
  SYSTEM: {
    icon: '⚙️',
    color: '#6b7280', // gray
  },
  PAYMENT: {
    icon: '💳',
    color: '#10b981', // emerald/green
  },
  ORDER: {
    icon: '📋',
    color: '#ec4899', // pink
  },
  ACCOUNT: {
    icon: '👤',
    color: '#06b6d4', // cyan
  },
  MILESTONE_FIFTY: {
    icon: '🎯',
    color: '#3b82f6', // blue
  },
  MILESTONE_NINETY: {
    icon: '🔥',
    color: '#f59e0b', // amber
  },
  MILESTONE_MOQ: {
    icon: '🎉',
    color: '#10b981', // green
  },
};

/**
 * Create an alert for a user
 * Enhanced with better defaults and validation
 */
export async function createUserAlert(params: {
  userId: string;
  type: 'GROUP_UPDATE' | 'SHIPPING' | 'PROMOTION' | 'SYSTEM' | 'PAYMENT' | 'ORDER' | 'ACCOUNT';
  title: string;
  body: string;
  link?: string;
  priority?: boolean;
  poolId?: string;
  productName?: string;
  metadata?: Record<string, any>;
}) {
  if (!prisma) return null;
  
  try {
    // Validate title and body are not empty
    if (!params.title.trim() || !params.body.trim()) {
      console.warn('Attempted to create alert with empty title or body');
      return null;
    }
    
    const alert = await (prisma as any).alert.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        status: 'UNREAD',
        triageStatus: 'OPEN',
        priority: params.priority || false,
        poolId: params.poolId,
        productName: params.productName,
        metadata: params.metadata || {},
      },
    });
    
    return alert;
  } catch (error) {
    console.error('Failed to create user alert:', error);
    return null;
  }
}

/**
 * Get notification display config (icon, color) for a given type
 */
export function getNotificationConfig(type: string, milestone?: string) {
  if (milestone === 'FIFTY') return NOTIFICATION_CONFIG.MILESTONE_FIFTY;
  if (milestone === 'NINETY') return NOTIFICATION_CONFIG.MILESTONE_NINETY;
  if (milestone === 'MOQ') return NOTIFICATION_CONFIG.MILESTONE_MOQ;
  
  return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG] || NOTIFICATION_CONFIG.SYSTEM;
}

/**
 * Mark multiple alerts as read
 */
export async function markAlertsAsRead(alertIds: string[]) {
  if (!prisma || !alertIds.length) return 0;
  
  try {
    const result = await (prisma as any).alert.updateMany({
      where: { id: { in: alertIds } },
      data: { status: 'READ' },
    });
    
    return result.count;
  } catch (error) {
    console.error('Failed to mark alerts as read:', error);
    return 0;
  }
}

/**
 * Get unread alert count for a user
 */
export async function getUnreadAlertCount(userId: string) {
  if (!prisma) return 0;
  
  try {
    const count = await (prisma as any).alert.count({
      where: {
        userId,
        status: 'UNREAD',
      },
    });
    
    return count;
  } catch (error) {
    console.error('Failed to get unread alert count:', error);
    return 0;
  }
}

/**
 * Delete old read alerts (cleanup utility)
 * Keeps alerts from last 30 days or unread/priority alerts
 */
export async function cleanupOldAlerts(daysToKeep: number = 30) {
  if (!prisma) return 0;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await (prisma as any).alert.deleteMany({
      where: {
        status: 'READ',
        priority: false,
        createdAt: { lt: cutoffDate },
      },
    });
    
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup old alerts:', error);
    return 0;
  }
}

/**
 * Create alerts for all admin users
 */
export async function createAdminAlert(params: {
  type: 'GROUP_UPDATE' | 'SHIPPING' | 'PROMOTION' | 'SYSTEM';
  title: string;
  body: string;
  link?: string;
  priority?: boolean;
}) {
  if (!prisma) return [];
  
  try {
    // Get all admin users
    const admins = await (prisma as any).user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    // Create an alert for each admin
    const alertPromises = admins.map((admin: any) =>
      createUserAlert({
        userId: admin.id,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        priority: params.priority,
      })
    );
    
    const alerts = await Promise.all(alertPromises);
    
    return alerts.filter(Boolean);
  } catch (error) {
    console.error('Failed to create admin alerts:', error);
    return [];
  }
}

/**
 * Create a pool progress alert for a user
 */
export async function createPoolProgressAlert(params: {
  userId: string;
  poolId: string;
  productTitle: string;
  currentQty: number;
  targetQty: number;
  milestone?: 'FIFTY' | 'NINETY' | 'MOQ';
}) {
  const progressPercentage = Math.round((params.currentQty / params.targetQty) * 100);
  
  let title = `Pool Progress Update: ${params.productTitle}`;
  let body = `The pool has reached ${params.currentQty} out of ${params.targetQty} units (${progressPercentage}%).`;
  
  if (params.milestone === 'FIFTY') {
    title = `🎯 Halfway There! ${params.productTitle}`;
    body = `Great news! The pool has reached 50% of its goal. We're at ${params.currentQty} out of ${params.targetQty} units.`;
  } else if (params.milestone === 'NINETY') {
    title = `🔥 Almost There! ${params.productTitle}`;
    body = `The pool is 90% full! Only ${params.targetQty - params.currentQty} more units needed. We're at ${params.currentQty} out of ${params.targetQty} units.`;
  } else if (params.milestone === 'MOQ') {
    title = `🎉 Pool Complete! ${params.productTitle}`;
    body = `Congratulations! The pool has reached its MOQ of ${params.targetQty} units. Your order will be placed soon!`;
  }
  
  return createUserAlert({
    userId: params.userId,
    type: 'GROUP_UPDATE',
    title,
    body,
    link: `/pools/${params.poolId}`,
    priority: params.milestone === 'MOQ',
    poolId: params.poolId,
    productName: params.productTitle,
  });
}

/**
 * Send pool join notification to existing pool participants
 */
export async function notifyExistingPoolParticipants(params: {
  poolId: string;
  productTitle: string;
  newParticipantName: string;
  currentQty: number;
  targetQty: number;
  excludeUserId?: string; // Exclude the new participant from notifications
}) {
  if (!prisma) return [];
  
  try {
    // Get all pool participants except the new one
    const poolItems = await (prisma as any).poolItem.findMany({
      where: {
        poolId: params.poolId,
        ...(params.excludeUserId && { userId: { not: params.excludeUserId } }),
      },
      select: {
        userId: true,
      },
    });
    
    // Create unique set of user IDs
    const userIds: string[] = Array.from(new Set(poolItems.map((item: any) => String(item.userId))));
    
    const progressPercentage = Math.round((params.currentQty / params.targetQty) * 100);
    
    // Create alerts for all participants
    const alertPromises = userIds.map((userId) =>
      createUserAlert({
        userId,
        type: 'GROUP_UPDATE',
        title: `New participant joined your pool!`,
        body: `${params.newParticipantName} joined the pool for ${params.productTitle}. Progress: ${params.currentQty}/${params.targetQty} units (${progressPercentage}%)`,
        link: `/pools/${params.poolId}`,
        poolId: params.poolId,
        productName: params.productTitle,
      })
    );
    
    const alerts = await Promise.all(alertPromises);
    
    return alerts.filter(Boolean);
  } catch (error) {
    console.error('Failed to notify existing pool participants:', error);
    return [];
  }
}

/**
 * Check if pool has reached a milestone and update accordingly
 * Now also sends milestone emails!
 */
export async function checkAndUpdatePoolMilestone(poolId: string) {
  if (!prisma) return null;
  
  try {
    const pool = await (prisma as any).pool.findUnique({
      where: { id: poolId },
      include: {
        product: { select: { title: true } },
        items: { 
          select: { 
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          } 
        },
      },
    });
    
    if (!pool) return null;
    
    const progressPercentage = (pool.pledgedQty / pool.targetQty) * 100;
    let newMilestone: 'FIFTY' | 'NINETY' | 'MOQ' | null = null;
    
    // Determine if we've hit a new milestone
    if (progressPercentage >= 100 && pool.lastProgressMilestone !== 'MOQ') {
      newMilestone = 'MOQ';
    } else if (progressPercentage >= 90 && pool.lastProgressMilestone === 'NONE') {
      newMilestone = 'NINETY';
    } else if (progressPercentage >= 50 && pool.lastProgressMilestone === 'NONE') {
      newMilestone = 'FIFTY';
    }
    
    // If we've hit a new milestone, update the pool and notify participants
    if (newMilestone) {
      await (prisma as any).pool.update({
        where: { id: poolId },
        data: { lastProgressMilestone: newMilestone },
      });
      
      // Get unique user IDs and their info from pool items
      const uniqueUsers = Array.from(
        new Map(
          pool.items.map((item: any) => [
            String(item.userId), 
            { 
              id: String(item.userId), 
              name: item.user.name,
              email: item.user.email 
            }
          ])
        ).values()
      );
      
      // Send in-app notifications and emails to all participants
      // Import sendPoolMilestoneEmail dynamically to avoid circular dependencies
      const { sendPoolMilestoneEmail } = await import('./email');
      
      await Promise.all(
        uniqueUsers.map(async (user: any) => {
          // Create in-app alert
          await createPoolProgressAlert({
            userId: user.id,
            poolId,
            productTitle: pool.product.title,
            currentQty: pool.pledgedQty,
            targetQty: pool.targetQty,
            milestone: newMilestone || undefined,
          });
          
          // Send email notification
          await sendPoolMilestoneEmail({
            userName: user.name,
            userEmail: user.email,
            productTitle: pool.product.title,
            poolId,
            currentProgress: pool.pledgedQty,
            targetQty: pool.targetQty,
            milestone: newMilestone as 'FIFTY' | 'NINETY' | 'MOQ',
            deadlineAt: pool.deadlineAt || undefined,
          }).catch((err) => {
            console.error(`Failed to send milestone email to ${user.email}:`, err);
          });
        })
      );
      
      return { milestone: newMilestone, pool };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to check pool milestone:', error);
    return null;
  }
}
