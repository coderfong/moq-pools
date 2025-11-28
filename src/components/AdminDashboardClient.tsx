"use client";

import { useEffect, useState } from 'react';
import { Users, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activePools: number;
  totalRevenue: number;
  growthRate: number;
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activePools: 0,
    totalRevenue: 0,
    growthRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, fetch from API
        // const response = await fetch('/api/admin/stats');
        // const data = await response.json();
        
        // Mock data for now
        setStats({
          totalUsers: 12453,
          activePools: 234,
          totalRevenue: 458932,
          growthRate: 23.5,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Active Pools"
          value={stats.activePools.toLocaleString()}
          icon={<Package className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.growthRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Pending Actions</h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• 5 pools waiting for approval</li>
              <li>• 12 user reports to review</li>
              <li>• 3 payment disputes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavCard
          title="Pool Management"
          description="View and manage all product pools"
          href="/admin/pools"
        />
        <NavCard
          title="User Management"
          description="Manage users and permissions"
          href="/admin/users"
        />
        <NavCard
          title="Analytics"
          description="View detailed analytics and reports"
          href="/admin/analytics"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function NavCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
