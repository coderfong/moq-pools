"use client";

import Link from 'next/link';
import { 
  Users, ShoppingCart, Package, AlertCircle, TrendingUp, 
  TrendingDown, Clock, CheckCircle, XCircle, Activity 
} from 'lucide-react';
import { AdminBulkExport } from '@/components/AdminExportButton';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    activePools: number;
    totalOrders: number;
    pendingPools: number;
    recentUsers: number;
    recentOrders: number;
    totalRevenue: number;
    activeUsers: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    status: string | null;
    pledges: number;
    createdAt: string;
  }>;
  lowStockPools: Array<{
    id: string;
    title: string;
    deadlineAt: string | null;
    pledgedQty: number;
    targetQty: number;
  }>;
}

export default function AdminDashboardClient({ stats, recentActivity, lowStockPools }: AdminDashboardProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FULFILLED':
        return 'bg-blue-100 text-blue-700';
      case 'LOCKED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDaysUntilDeadline = (deadlineAt: string | null) => {
    if (!deadlineAt) return null;
    const days = Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening</p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          View all admin pages →
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.totalUsers)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{stats.recentUsers} this week</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Pools */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Pools</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.activePools)}</p>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">{stats.pendingPools} pending</span>
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.totalOrders)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{stats.recentOrders} this week</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.activeUsers)}</p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Last 30 days</span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Pool Activity</h2>
            <Link href="/admin/pools" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              View all →
            </Link>
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={`/pools/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.pledges} {item.pledges === 1 ? 'pledge' : 'pledges'} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {item.status || 'UNKNOWN'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Urgent Alerts
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {lowStockPools.length}
            </span>
          </div>
          
          {lowStockPools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p className="text-sm font-medium text-green-600">All pools are on track!</p>
              <p className="text-xs text-gray-500 mt-1">No urgent deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockPools.map((pool) => {
                const daysLeft = getDaysUntilDeadline(pool.deadlineAt);
                const progress = Math.round((pool.pledgedQty / pool.targetQty) * 100);
                
                return (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}`}
                    className="block p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 flex-1 pr-2">{pool.title}</p>
                      {daysLeft !== null && (
                        <span className="text-xs font-medium text-red-700 whitespace-nowrap">
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{progress}% filled</span>
                        <span>{pool.pledgedQty} / {pool.targetQty}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout - Quick Actions & Data Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/pools"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center transition-colors"
            >
              <Package className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Manage Pools</p>
            </Link>
            <Link
              href="/admin/support-tickets"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center transition-colors"
            >
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Support Tickets</p>
            </Link>
            <Link
              href="/admin/payments"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center transition-colors"
            >
              <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Payments</p>
            </Link>
            <Link
              href="/admin/alerts"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center transition-colors"
            >
              <Users className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">User Alerts</p>
            </Link>
          </div>
        </div>

        {/* Data Export */}
        <AdminBulkExport />
      </div>
    </div>
  );
}
