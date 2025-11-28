import AdminDashboardClient from './AdminDashboardClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Fetch real admin stats from database
async function getAdminStats() {
  try {
    // Use raw SQL to bypass enum validation issues
    const [
      totalUsersResult,
      activePoolsResult,
      openPoolsResult,
      totalPoolItemsResult,
      recentUsersResult,
      recentPoolItemsResult,
      totalRevenueResult,
      activeUsersResult
    ] = await Promise.all([
      // Total users
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`,
      
      // Active pools (including OPEN, LOCKED, ACTIVE statuses)
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Pool" WHERE status IN ('OPEN', 'LOCKED', 'ACTIVE')`,
      
      // Open pools
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Pool" WHERE status = 'OPEN'`,
      
      // Total pool items
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "PoolItem"`,
      
      // Recent users (last 7 days)
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "User" 
        WHERE "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
      `,
      
      // Recent pool items (last 7 days)
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "PoolItem" 
        WHERE "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
      `,
      
      // Total revenue from pool items with captured payments
      prisma.$queryRaw`
        SELECT COALESCE(SUM(pi."unitPrice" * pi.quantity), 0) as total
        FROM "PoolItem" pi
        JOIN "Payment" p ON pi.id = p."poolItemId"
        WHERE p.status = 'CAPTURED'
      `,
      
      // Active users (last 30 days with pool items)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT pi."userId") as count
        FROM "PoolItem" pi
        WHERE pi."createdAt" >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
      `
    ]);
    
    // Get recent pool activity
    const recentPoolActivity = await prisma.$queryRaw`
      SELECT 
        p.id,
        pr.title,
        p.status,
        p."createdAt",
        COUNT(pi.id) as pledges
      FROM "Pool" p
      LEFT JOIN "Product" pr ON p."productId" = pr.id
      LEFT JOIN "PoolItem" pi ON p.id = pi."poolId"
      GROUP BY p.id, pr.title, p.status, p."createdAt"
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;
    
    // Get admin action items based on pool lifecycle
    const adminActionItems = await prisma.$queryRaw`
      SELECT 
        p.id,
        pr.title,
        p.status,
        p."deadlineAt",
        p."targetQty",
        p."moqReachedAt",
        COALESCE(SUM(pi.quantity), 0) as pledged_qty,
        COUNT(pi.id) as order_count
      FROM "Pool" p
      LEFT JOIN "Product" pr ON p."productId" = pr.id
      LEFT JOIN "PoolItem" pi ON p.id = pi."poolId"
      WHERE p.status IN ('OPEN', 'LOCKED', 'ACTIVE', 'FULFILLING')
      GROUP BY p.id, pr.title, p.status, p."deadlineAt", p."targetQty", p."moqReachedAt"
      ORDER BY 
        CASE 
          WHEN p.status = 'FULFILLING' THEN 1
          WHEN p.status = 'ACTIVE' THEN 2
          WHEN p."deadlineAt" <= ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)} THEN 3
          ELSE 4
        END,
        p."deadlineAt" ASC
    `;
    
    // Process results
    const totalUsers = Number(totalUsersResult[0].count);
    const activePools = Number(activePoolsResult[0].count);
    const pendingPools = Number(openPoolsResult[0].count);
    const totalPoolItems = Number(totalPoolItemsResult[0].count);
    const recentUsers = Number(recentUsersResult[0].count);
    const recentPoolItems = Number(recentPoolItemsResult[0].count);
    const totalRevenue = Number(totalRevenueResult[0].total || 0);
    const activeUsers = Number(activeUsersResult[0].count);
    
    // Process recent activity
    const recentActivity = recentPoolActivity.map(pool => ({
      id: pool.id,
      title: pool.title || 'Untitled Pool',
      status: pool.status,
      pledges: Number(pool.pledges),
      createdAt: new Date(pool.createdAt).toISOString()
    }));
    
    // Process urgent pools
    const lowStockPools = adminActionItems
      .map(pool => {
        const pledgedQty = Number(pool.pledged_qty);
        const targetQty = Number(pool.targetQty);
        const progress = targetQty ? (pledgedQty / targetQty) * 100 : 0;
        const daysUntilDeadline = pool.deadlineAt 
          ? Math.ceil((new Date(pool.deadlineAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        
        let actionType = '';
        let actionMessage = '';
        let priority = 'medium';
        
        if (pool.status === 'FULFILLING') {
          actionType = 'Follow up on shipping';
          actionMessage = 'Pool is being fulfilled - check supplier delivery status';
          priority = 'high';
        } else if (pool.status === 'ACTIVE' && pool.moqReachedAt) {
          actionType = 'Contact supplier';
          actionMessage = 'MOQ reached - initiate order with supplier';
          priority = 'high';
        } else if (progress >= 90 && progress < 100) {
          actionType = 'Prepare for fulfillment';
          actionMessage = 'Pool nearly full - prepare supplier contact and order details';
          priority = 'medium';
        } else if (progress >= 75 && progress < 90) {
          actionType = 'Boost promotion';
          actionMessage = 'Pool 75% full - send marketing push to reach target';
          priority = 'medium';
        } else if (daysUntilDeadline !== null && daysUntilDeadline <= 2 && progress < 50) {
          actionType = 'Low participation alert';
          actionMessage = 'Deadline approaching with low participation - consider extending or canceling';
          priority = 'high';
        } else if (daysUntilDeadline !== null && daysUntilDeadline <= 1) {
          actionType = 'Deadline tomorrow';
          actionMessage = 'Pool deadline tomorrow - final decision needed';
          priority = 'high';
        } else if (daysUntilDeadline !== null && daysUntilDeadline <= 0) {
          actionType = 'Deadline passed';
          actionMessage = 'Pool deadline passed - lock pool or extend deadline';
          priority = 'urgent';
        }
        
        return {
          id: pool.id,
          title: pool.title || 'Untitled Pool',
          deadlineAt: pool.deadlineAt ? new Date(pool.deadlineAt).toISOString() : null,
          pledgedQty,
          targetQty,
          progress,
          actionType,
          actionMessage,
          priority,
          status: pool.status,
          orderCount: Number(pool.order_count),
          daysUntilDeadline
        };
      })
      .filter(pool => pool.actionType) // Only show pools that need action
      .slice(0, 8); // Max 8 action items
    
    return {
      stats: {
        totalUsers,
        activePools,
        totalOrders: totalPoolItems,
        pendingPools,
        recentUsers,
        recentOrders: recentPoolItems,
        totalRevenue,
        activeUsers
      },
      recentActivity,
      lowStockPools
    };
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    
    // Return fallback data in case of error
    return {
      stats: {
        totalUsers: 0,
        activePools: 0,
        totalOrders: 0,
        pendingPools: 0,
        recentUsers: 0,
        recentOrders: 0,
        totalRevenue: 0,
        activeUsers: 0
      },
      recentActivity: [],
      lowStockPools: []
    };
  }
}

export default async function AdminDashboard() {
  const data = await getAdminStats();
  return <AdminDashboardClient {...data} />;
}
