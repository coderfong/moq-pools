"use client";

import { BarChart, LineChart, DonutChart } from '@/components/AdminCharts';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import AdminExportButton from '@/components/AdminExportButton';

interface AnalyticsData {
  userGrowthData: Array<{ label: string; value: number }>;
  revenueData: Array<{ label: string; value: number }>;
  poolStatusData: Array<{ label: string; value: number; color: string }>;
  topCategoriesData: Array<{ label: string; value: number; color: string }>;
  quickStats: {
    avgOrderValue: number;
    conversionRate: number;
    poolSuccessRate: number;
    avgDaysToDeadline: number;
  };
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Insights and trends across your platform</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <LineChart
        data={revenueData}
        title="Revenue Trend"
        subtitle="Last 6 months"
        trend="up"
        trendValue="+24%"
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <LineChart
          data={userGrowthData}
          title="User Growth"
          subtitle="Weekly new signups"
          trend="up"
          trendValue="+18%"
        />

        {/* Pool Status Distribution */}
        <DonutChart
          data={poolStatusData}
          title="Pool Status Distribution"
          subtitle="Current pool statuses"
        />
      </div>

      {/* Top Categories */}
      <BarChart
        data={topCategoriesData}
        title="Top Product Categories"
        showValues={true}
      />

      {/* Export Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-orange-600" />
          Export Analytics Data
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Download detailed analytics reports for your records or external analysis
        </p>
        <div className="flex flex-wrap gap-3">
          <AdminExportButton type="users" />
          <AdminExportButton type="pools" />
          <AdminExportButton type="orders" />
          <AdminExportButton type="payments" />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900">$127</p>
          <p className="text-xs text-green-600 mt-1">+12% vs last month</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Conversion Rate</p>
          <p className="text-3xl font-bold text-gray-900">3.2%</p>
          <p className="text-xs text-green-600 mt-1">+0.4% vs last month</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Pool Success Rate</p>
          <p className="text-3xl font-bold text-gray-900">89%</p>
          <p className="text-xs text-green-600 mt-1">+5% vs last month</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Avg Days to Fill</p>
          <p className="text-3xl font-bold text-gray-900">12</p>
          <p className="text-xs text-red-600 mt-1">+2 days vs last month</p>
        </div>
      </div>
    </div>
  );
}
