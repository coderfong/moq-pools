import { getSession } from '../api/_lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountDashboardClient from './AccountDashboardClient';

export const metadata = { title: 'Account - MOQ Pools' };

export default async function AccountPage() {
  const session = getSession();
  if (!session?.sub || !prisma) redirect('/login?next=/account');

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          poolItems: true,
          productViews: true,
        },
      },
    },
  });

  if (!user) redirect('/login?next=/account');

  // Get recent pool items (orders)
  const recentPoolItems = await prisma.poolItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      pool: {
        select: {
          status: true,
          product: {
            select: {
              title: true,
              imagesJson: true,
              unitPrice: true,
              baseCurrency: true,
            },
          },
        },
      },
    },
  });

  // Get recent product views
  const recentViews = await prisma.productView.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: 'desc' },
    take: 5,
    select: {
      productTitle: true,
      productImage: true,
      viewedAt: true,
    },
  });

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate dashboard stats
  const allPoolItems = await prisma.poolItem.findMany({
    where: { userId: user.id },
    include: {
      pool: {
        select: {
          product: {
            select: {
              unitPrice: true,
              baseCurrency: true,
            },
          },
        },
      },
    },
  });

  const totalSpent = allPoolItems.reduce((sum, item) => {
    const price = Number(item.pool?.product?.unitPrice || 0);
    return sum + (price * item.quantity);
  }, 0);

  const avgOrderValue = allPoolItems.length > 0 ? totalSpent / allPoolItems.length : 0;

  // Get monthly order counts (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await prisma.poolItem.groupBy({
    by: ['createdAt'],
    where: {
      userId: user.id,
      createdAt: { gte: sixMonthsAgo },
    },
    _count: true,
  });

  // Group by month
  const monthlyOrders = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const count = monthlyData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
    }).length;

    return { month: monthKey, count };
  });

  // Build recent activity
  const recentActivity = [
    ...recentPoolItems.slice(0, 3).map(item => ({
      id: item.id,
      type: 'order' as const,
      title: `Ordered ${item.pool?.product?.title || 'Product'}`,
      date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
    ...recentViews.slice(0, 2).map((view, idx) => ({
      id: `view-${idx}`,
      type: 'view' as const,
      title: `Viewed ${view.productTitle}`,
      date: new Date(view.viewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
  ].sort((a, b) => {
    // Sort by date descending
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }).slice(0, 5);

  const dashboardStats = {
    totalOrders: user._count.poolItems,
    totalSpent,
    totalViews: user._count.productViews,
    avgOrderValue,
    monthlyOrders,
    recentActivity,
  };

  return (
    <div className="w-full">
      <div className="py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-gray-900">
            Welcome back, {user.name || 'there'}!
          </h1>
          <p className="mt-2 text-gray-600">Member since {memberSince}</p>
        </div>

        {/* Enhanced Dashboard */}
        <AccountDashboardClient stats={dashboardStats} />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Recent Orders</h2>
              <Link
                href="/account/orders"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentPoolItems.length === 0 ? (
                <div className="rounded-xl bg-card p-6 shadow-card border-hairline text-center">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-muted">No orders yet</p>
                  <Link
                    href="/pools"
                    className="mt-3 inline-block text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Start shopping →
                  </Link>
                </div>
              ) : (
                recentPoolItems.map((item) => {
                  const product = item.pool?.product;
                  const images = product?.imagesJson ? JSON.parse(product.imagesJson) : [];
                  const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
                  
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-card p-4 shadow-card border-hairline flex items-start gap-4"
                    >
                      {firstImage && (
                        <img
                          src={firstImage}
                          alt={product?.title || 'Product'}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-ink truncate">
                          {product?.title || 'Product'}
                        </h3>
                        <p className="text-sm text-muted mt-1">
                          Quantity: {item.quantity} • {product?.baseCurrency}{Number(product?.unitPrice || 0).toFixed(2)} each
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              item.pool?.status === 'OPEN'
                                ? 'bg-green-100 text-green-700'
                                : item.pool?.status === 'LOCKED' || item.pool?.status === 'ORDER_PLACED'
                                ? 'bg-blue-100 text-blue-700'
                                : item.pool?.status === 'FULFILLING'
                                ? 'bg-purple-100 text-purple-700'
                                : item.pool?.status === 'FULFILLED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.pool?.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recently Viewed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Recently Viewed</h2>
              <Link
                href="/account/history"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentViews.length === 0 ? (
                <div className="rounded-xl bg-card p-6 shadow-card border-hairline text-center">
                  <div className="text-4xl mb-2">👀</div>
                  <p className="text-muted">No viewing history yet</p>
                  <Link
                    href="/pools"
                    className="mt-3 inline-block text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Browse products →
                  </Link>
                </div>
              ) : (
                recentViews.map((view, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-card p-4 shadow-card border-hairline flex items-start gap-4"
                  >
                    {view.productImage && (
                      <img
                        src={view.productImage}
                        alt={view.productTitle}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink truncate">
                        {view.productTitle}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {new Date(view.viewedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-bold text-ink mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Link
              href="/account/settings"
              className="rounded-xl bg-card p-4 shadow-card border-hairline hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium text-ink">Settings</div>
              <div className="text-sm text-muted mt-1">Update your profile</div>
            </Link>
            <Link
              href="/account/payments"
              className="rounded-xl bg-card p-4 shadow-card border-hairline hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">💳</div>
              <div className="font-medium text-ink">Payments</div>
              <div className="text-sm text-muted mt-1">Manage payment methods</div>
            </Link>
            <Link
              href="/support"
              className="rounded-xl bg-card p-4 shadow-card border-hairline hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="font-medium text-ink">Support</div>
              <div className="text-sm text-muted mt-1">Get help</div>
            </Link>
            <Link
              href="/pools"
              className="rounded-xl bg-card p-4 shadow-card border-hairline hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-medium text-ink">Browse</div>
              <div className="text-sm text-muted mt-1">Explore products</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
