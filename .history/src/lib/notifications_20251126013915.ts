import { prisma } from './prisma';

/**
 * Create an alert for a user
 */
export async function createUserAlert(params: {
  userId: string;
  type: 'GROUP_UPDATE' | 'SHIPPING' | 'PROMOTION' | 'SYSTEM';
  title: string;
  body: string;
  link?: string;
  priority?: boolean;
}) {
  if (!prisma) return null;
  
  try {
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
      },
    });
    
    return alert;
  } catch (error) {
    console.error('Failed to create user alert:', error);
    return null;
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
    const alerts = await Promise.all(
      admins.map((admin: any) =>
        createUserAlert({
          userId: admin.id,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
          priority: params.priority,
        })
      )
    );
    
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
    const userIds: string[] = [...new Set(poolItems.map((item: any) => item.userId))];
    
    const progressPercentage = Math.round((params.currentQty / params.targetQty) * 100);
    
    // Create alerts for all participants
    const alerts = await Promise.all(
      userIds.map((userId) =>
        createUserAlert({
          userId,
          type: 'GROUP_UPDATE',
          title: `New participant joined your pool!`,
          body: `${params.newParticipantName} joined the pool for ${params.productTitle}. Progress: ${params.currentQty}/${params.targetQty} units (${progressPercentage}%)`,
          link: `/pools/${params.poolId}`,
        })
      )
    );
    
    return alerts.filter(Boolean);
  } catch (error) {
    console.error('Failed to notify existing pool participants:', error);
    return [];
  }
}

/**
 * Check if pool has reached a milestone and update accordingly
 */
export async function checkAndUpdatePoolMilestone(poolId: string) {
  if (!prisma) return null;
  
  try {
    const pool = await (prisma as any).pool.findUnique({
      where: { id: poolId },
      include: {
        product: { select: { title: true } },
        items: { select: { userId: true } },
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
      
      // Get unique user IDs from pool items
      const userIds: string[] = [...new Set(pool.items.map((item: any) => item.userId))];
      
      // Notify all participants of the milestone
      await Promise.all(
        userIds.map((userId) =>
          createPoolProgressAlert({
            userId,
            poolId,
            productTitle: pool.product.title,
            currentQty: pool.pledgedQty,
            targetQty: pool.targetQty,
            milestone: newMilestone || undefined,
          })
        )
      );
      
      return { milestone: newMilestone, pool };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to check pool milestone:', error);
    return null;
  }
}
