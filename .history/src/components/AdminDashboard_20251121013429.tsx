"use client";

import { useState } from 'react';
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface AdminDashboardProps {
  className?: string;
}

export default function AdminDashboard({ className = '' }: AdminDashboardProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock data
  const stats = {
    totalUsers: 12458,
    activeUsers: 8234,
    totalPools: 567,
    activePools: 234,
    totalRevenue: 458920,
    totalOrders: 3421,
  };

  const recentPools = [
    {
      id: '1',
      title: 'Premium Mechanical Keyboard Kit',
      status: 'active',
      progress: 85,
      creator: 'John Doe',
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Artisan Keycap Set',
      status: 'completed',
      progress: 100,
      creator: 'Jane Smith',
      createdAt: new Date(),
    },
    {
      id: '3',
      title: 'Custom Desk Mat',
      status: 'pending',
      progress: 45,
      creator: 'Bob Wilson',
      createdAt: new Date(),
    },
  ];

  const pendingActions = [
    {
      id: '1',
      type: 'pool_approval',
      message: 'New pool "Gaming Mouse Bundle" needs approval',
      priority: 'high',
    },
    {
      id: '2',
      type: 'user_report',
      message: 'User reported suspicious activity',
      priority: 'high',
    },
    {
      id: '3',
      type: 'product_review',
      message: '5 new product listings pending review',
      priority: 'medium',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your MOQ Pools platform</p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {period === '7d' && 'Last 7 days'}
              {period === '30d' && 'Last 30 days'}
              {period === '90d' && 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Total Users</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</span>
            <span className="text-sm font-medium text-green-600 mb-1">+12%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.activeUsers.toLocaleString()} active</p>
        </div>

        {/* Total Pools */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Total Pools</span>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{stats.totalPools}</span>
            <span className="text-sm font-medium text-green-600 mb-1">+8%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.activePools} active</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">
              ${(stats.totalRevenue / 1000).toFixed(1)}k
            </span>
            <span className="text-sm font-medium text-green-600 mb-1">+23%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">From {stats.totalOrders} orders</p>
        </div>

        {/* Growth Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Growth Rate</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">18.5%</span>
            <span className="text-sm font-medium text-green-600 mb-1">+4.2%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Month over month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Pools */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Pools</h3>
            <Link href="/admin/pools" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {recentPools.map((pool) => (
              <div
                key={pool.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0">{getStatusIcon(pool.status)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">{pool.title}</h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      pool.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : pool.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {pool.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>by {pool.creator}</span>
                    <span>{pool.progress}% funded</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full transition-all"
                      style={{ width: `${pool.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Actions</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              {pendingActions.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      action.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  />
                  <p className="text-sm text-gray-900 flex-1">{action.message}</p>
                </div>
                <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                  Take Action →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/admin/pools/new"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors font-medium"
          >
            <Package className="w-4 h-4" />
            <span>Create Pool</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            <span>View Analytics</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
