import { prisma } from '@/lib/prisma';
import { getSession } from '@/app/_lib/session';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  try {
    // Fetch all stats in parallel for better performance
    const [
      totalUsers,
      activePools,
      totalOrders,
      pendingPools,
      recentUsers,
      recentOrders,
      totalRevenue,
      activeUsers,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active pools
      prisma.pool.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Total orders/pledges
      prisma.poolPledge.count(),
      
      // Pending pools (need admin action)
      prisma.pool.count({
        where: { status: 'PENDING' }
      }),
      
      // Recent users (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Recent orders (last 7 days)
      prisma.poolPledge.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Calculate total revenue from fulfilled orders
      prisma.poolPledge.aggregate({
        where: {
          pool: {
            status: 'FULFILLED'
          }
        },
        _sum: {
          quantity: true
        }
      }),
      
      // Active users (had activity in last 30 days)
      prisma.user.count({
        where: {
          OR: [
            {
              poolPledges: {
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
    ]);

    // Get recent activity
    const recentActivity = await prisma.pool.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            title: true,
          }
        },
        _count: {
          select: {
            poolPledges: true
          }
        }
      }
    });

    // Get low stock alerts (pools close to MOQ deadline)
    const lowStockPools = await prisma.pool.findMany({
      where: {
        status: 'ACTIVE',
        deadlineAt: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days or less
        }
      },
      include: {
        product: {
          select: {
            title: true,
          }
        }
      },
      take: 5,
      orderBy: { deadlineAt: 'asc' }
    });

    return {
      stats: {
        totalUsers,
        activePools,
        totalOrders,
        pendingPools,
        recentUsers,
        recentOrders,
        totalRevenue: totalRevenue._sum.quantity || 0,
        activeUsers,
      },
      recentActivity: recentActivity.map(pool => ({
        id: pool.id,
        title: pool.product?.title || 'Unknown Product',
        status: pool.status,
        pledges: pool._count.poolPledges,
        createdAt: pool.createdAt.toISOString(),
      })),
      lowStockPools: lowStockPools.map(pool => ({
        id: pool.id,
        title: pool.product?.title || 'Unknown Product',
        deadlineAt: pool.deadlineAt?.toISOString() || null,
        pledgedQty: pool.pledgedQty,
        targetQty: pool.targetQty,
      })),
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      stats: {
        totalUsers: 0,
        activePools: 0,
        totalOrders: 0,
        pendingPools: 0,
        recentUsers: 0,
        recentOrders: 0,
        totalRevenue: 0,
        activeUsers: 0,
      },
      recentActivity: [],
      lowStockPools: [],
    };
  }
}

export default async function AdminDashboard() {
  const session = await getSession();
  
  // Check if user is admin
  if (!session?.user?.email || session.user.email.toLowerCase() !== 'jonfong78@gmail.com') {
    redirect('/');
  }

  const data = await getAdminStats();

  return <AdminDashboardClient {...data} />;
}
