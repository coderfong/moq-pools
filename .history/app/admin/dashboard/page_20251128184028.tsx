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
    
    // Get urgent pools
    const urgentPools = await prisma.$queryRaw`
      SELECT 
        p.id,
        pr.title,
        p.status,
        p."deadlineAt",
        p."targetQty",
        COALESCE(SUM(pi.quantity), 0) as pledged_qty
      FROM "Pool" p
      LEFT JOIN "Product" pr ON p."productId" = pr.id
      LEFT JOIN "PoolItem" pi ON p.id = pi."poolId"
      WHERE p.status IN ('OPEN', 'LOCKED', 'ACTIVE')
        AND p."deadlineAt" <= ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)}
      GROUP BY p.id, pr.title, p.status, p."deadlineAt", p."targetQty"
      ORDER BY p."deadlineAt" ASC
      LIMIT 5
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
    const lowStockPools = urgentPools
      .map(pool => {
        const pledgedQty = Number(pool.pledged_qty);
        const targetQty = Number(pool.targetQty);
        const progress = targetQty ? (pledgedQty / targetQty) * 100 : 0;
        
        return {
          id: pool.id,
          title: pool.title || 'Untitled Pool',
          deadlineAt: pool.deadlineAt ? new Date(pool.deadlineAt).toISOString() : null,
          pledgedQty,
          targetQty,
          progress
        };
      })
      .filter(pool => pool.progress < 90); // Only show pools under 90% funded
    
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
