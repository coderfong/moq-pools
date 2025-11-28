import AdminDashboardClient from './AdminDashboardClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Fetch real admin stats from database
async function getAdminStats() {
  try {
    // Get all stats in parallel
    const [
      totalUsers,
      activePools,
      pendingPools,
      totalOrders,
      recentUsers,
      recentOrders,
      totalRevenue,
      activeUsers,
      recentPoolActivity,
      urgentPools
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active pools
      prisma.pool.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Pending pools
      prisma.pool.count({
        where: { status: 'PENDING' }
      }),
      
      // Total orders
      prisma.order.count(),
      
      // Recent users (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Recent orders (last 7 days)
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total revenue from completed orders
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED'
        },
        _sum: {
          totalPrice: true
        }
      }),
      
      // Active users (last 30 days)
      prisma.user.count({
        where: {
          OR: [
            {
              orders: {
                some: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  }
                }
              }
            },
            {
              updatedAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        }
      }),
      
      // Recent pool activity (last 10 pools)
      prisma.pool.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { orders: true }
          }
        }
      }),
      
      // Urgent pools (deadline within 3 days and not fully funded)
      prisma.pool.findMany({
        where: {
          status: 'ACTIVE',
          deadlineAt: {
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
          }
        },
        include: {
          _count: {
            select: { orders: true }
          },
          orders: {
            select: {
              quantity: true
            }
          }
        }
      })
    ]);
    
    // Process recent activity
    const recentActivity = recentPoolActivity.map(pool => ({
      id: pool.id,
      title: pool.productTitle || 'Untitled Pool',
      status: pool.status,
      pledges: pool._count.orders,
      createdAt: pool.createdAt.toISOString()
    }));
    
    // Process low stock pools
    const lowStockPools = urgentPools
      .map(pool => {
        const pledgedQty = pool.orders.reduce((sum, order) => sum + order.quantity, 0);
        const progress = pool.targetQty ? (pledgedQty / pool.targetQty) * 100 : 0;
        
        return {
          id: pool.id,
          title: pool.productTitle || 'Untitled Pool',
          deadlineAt: pool.deadlineAt?.toISOString() || null,
          pledgedQty,
          targetQty: pool.targetQty || 0,
          progress
        };
      })
      .filter(pool => pool.progress < 90) // Only show pools under 90% funded
      .sort((a, b) => {
        // Sort by deadline (closest first)
        if (!a.deadlineAt) return 1;
        if (!b.deadlineAt) return -1;
        return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
      })
      .slice(0, 5); // Max 5 urgent pools
    
    return {
      stats: {
        totalUsers,
        activePools,
        totalOrders,
        pendingPools,
        recentUsers,
        recentOrders,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
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
