"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Eye,
  TrendingUp,
  Calendar,
  AlertCircle,
  Bell,
  Gift,
  Heart,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';

type DashboardStats = {
  totalOrders: number;
  totalSpent: number;
  totalViews: number;
  avgOrderValue: number;
  monthlyOrders: Array<{ month: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'view' | 'wishlist';
    title: string;
    date: string;
  }>;
};

export default function AccountDashboardClient({ stats }: { stats: DashboardStats }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

  // Calculate max for scaling chart bars
  const maxOrders = Math.max(...stats.monthlyOrders.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Quick Actions Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/account/orders"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white hover:shadow-lg transition-all"
        >
          <ShoppingCart className="w-6 h-6 mb-2" />
          <div className="text-sm font-medium">My Orders</div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          href="/account/wishlist"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 p-4 text-white hover:shadow-lg transition-all"
        >
          <Heart className="w-6 h-6 mb-2" />
          <div className="text-sm font-medium">Wishlist</div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          href="/compare"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white hover:shadow-lg transition-all"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <div className="text-sm font-medium">Compare</div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          href="/products"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white hover:shadow-lg transition-all"
        >
          <Package className="w-6 h-6 mb-2" />
          <div className="text-sm font-medium">Browse</div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </Link>
      </div>

      {/* Stats Dashboard with Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              12%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
          <div className="text-sm text-gray-600 mt-1">Total Orders</div>
        </div>

        {/* Total Spent */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              8%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</div>
          <div className="text-sm text-gray-600 mt-1">Total Spent</div>
        </div>

        {/* Products Viewed */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              24%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalViews}</div>
          <div className="text-sm text-gray-600 mt-1">Products Viewed</div>
        </div>

        {/* Avg Order Value */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-pink-100">
              <BarChart3 className="w-5 h-5 text-pink-600" />
            </div>
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              5%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">${stats.avgOrderValue.toFixed(2)}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Order Value</div>
        </div>
      </div>

      {/* Order History Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Order History</h3>
            <p className="text-sm text-gray-600 mt-1">Last 6 months</p>
          </div>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {stats.monthlyOrders.map((month, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">{month.month}</span>
                <span className="text-gray-900 font-bold">{month.count} orders</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${(month.count / maxOrders) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs for Activity */}
      <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recent Activity
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900">2 orders in progress</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Track your active orders and estimated delivery times
                  </div>
                  <Link
                    href="/account/orders"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                  >
                    View orders →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                <Gift className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-green-900">Referral Program</div>
                  <div className="text-sm text-green-700 mt-1">
                    Refer a friend and get $10 credit when they make their first purchase
                  </div>
                  <button className="text-sm text-green-600 hover:text-green-700 font-medium mt-2 inline-block">
                    Get referral link →
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-purple-50 border border-purple-100">
                <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-purple-900">Notifications</div>
                  <div className="text-sm text-purple-700 mt-1">
                    3 new updates on your orders and saved products
                  </div>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 inline-block">
                    View all →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              ) : (
                stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === 'order'
                          ? 'bg-orange-100'
                          : activity.type === 'wishlist'
                          ? 'bg-pink-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {activity.type === 'order' ? (
                        <ShoppingCart className="w-4 h-4 text-orange-600" />
                      ) : activity.type === 'wishlist' ? (
                        <Heart className="w-4 h-4 text-pink-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{activity.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{activity.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
