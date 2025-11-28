import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

// Mock data for now - in production, fetch from API or database
async function getAdminStats() {
  return {
    stats: {
      totalUsers: 1247,
      activePools: 28,
      totalOrders: 3561,
      pendingPools: 5,
      recentUsers: 32,
      recentOrders: 87,
      totalRevenue: 125000,
      activeUsers: 456,
    },
    recentActivity: [
      {
        id: '1',
        title: 'Premium Wireless Earbuds - Black',
        status: 'ACTIVE',
        pledges: 45,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Smart Watch Pro Series',
        status: 'FULFILLED',
        pledges: 120,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '3',
        title: 'USB-C Charging Cable 6ft',
        status: 'ACTIVE',
        pledges: 78,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
    lowStockPools: [
      {
        id: '1',
        title: 'Gaming Mouse RGB',
        deadlineAt: new Date(Date.now() + 86400000).toISOString(), // 1 day
        pledgedQty: 75,
        targetQty: 100,
      },
      {
        id: '2',
        title: 'Mechanical Keyboard',
        deadlineAt: new Date(Date.now() + 172800000).toISOString(), // 2 days
        pledgedQty: 40,
        targetQty: 50,
      },
    ],
  };
}

export default async function AdminDashboard() {
  const data = await getAdminStats();
  return <AdminDashboardClient {...data} />;
}
