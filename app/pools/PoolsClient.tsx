'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Grid, List, Filter, Clock, TrendingUp, Package, Users } from 'lucide-react';
import dynamic from 'next/dynamic';

const SyncedCountdown = dynamic(() => import('../../src/components/SyncedCountdown'), { ssr: false });

interface Pool {
  id: string;
  productId: string;
  title: string;
  image: string | null;
  unitPrice: number;
  currency: string;
  status: string;
  pledgedQty: number;
  targetQty: number;
  progress: number;
  participantCount: number;
  deadlineAt: string | null;
  supplier: string;
  moq: number;
}

interface PoolsClientProps {
  pools: Pool[];
  initialStatus: string;
  initialSort: string;
  initialView: string;
}

export default function PoolsClient({ pools, initialStatus, initialSort, initialView }: PoolsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>(initialView as 'grid' | 'list');

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/pools?${params.toString()}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'LOCKED':
      case 'ORDER_PLACED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'FULFILLING':
      case 'FULFILLED':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'LOCKED':
        return 'Locked';
      case 'ORDER_PLACED':
        return 'Ordered';
      case 'FULFILLING':
        return 'Shipping';
      case 'FULFILLED':
        return 'Fulfilled';
      default:
        return status;
    }
  };

  const getDaysRemaining = (deadlineAt: string | null) => {
    if (!deadlineAt) return null;
    const deadline = new Date(deadlineAt);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Pools</h1>
        <p className="text-gray-600">Join group buying pools to unlock wholesale pricing</p>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
            {[
              { value: 'all', label: 'All Pools' },
              { value: 'open', label: 'Open' },
              { value: 'locked', label: 'Locked' },
              { value: 'fulfilled', label: 'Fulfilled' },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => updateFilter('status', status.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  initialStatus === status.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Sort & View Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={initialSort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              title="Sort by"
            >
              <option value="moq-progress">Highest MOQ Progress</option>
              <option value="newest">Newest First</option>
              <option value="ending-soon">Ending Soon</option>
              <option value="most-popular">Most Popular</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  setView('grid');
                  updateFilter('view', 'grid');
                }}
                className={`p-2 ${
                  view === 'grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setView('list');
                  updateFilter('view', 'list');
                }}
                className={`p-2 ${
                  view === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {pools.length} {pools.length === 1 ? 'pool' : 'pools'}
      </div>

      {/* Pools Grid/List */}
      {pools.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pools found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters or check back later</p>
          <Link
            href="/products"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => {
            const daysRemaining = getDaysRemaining(pool.deadlineAt);
            const isAlmostFull = pool.progress >= 90;
            const isEndingSoon = daysRemaining !== null && daysRemaining <= 3;

            return (
              <Link
                key={pool.id}
                href={`/p/${pool.productId}`}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {pool.image ? (
                    <img
                      src={pool.image}
                      alt={pool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                        pool.status
                      )}`}
                    >
                      {getStatusLabel(pool.status)}
                    </span>
                    {pool.progress >= 90 && pool.status === 'OPEN' && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
                        🔥 Almost Full!
                      </span>
                    )}
                    {pool.status === 'OPEN' && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
                        <SyncedCountdown size="md" variant="default" showIcon={false} className="text-white" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[3rem]">
                    {pool.title}
                  </h3>

                  <div className="text-sm text-gray-600">
                    by {pool.supplier}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-orange-600">
                      {pool.currency} {pool.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-gray-600 text-sm">/ unit</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{pool.pledgedQty} joined</span>
                      <span>{pool.targetQty} needed</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pool.progress >= 100
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : pool.progress >= 90
                            ? 'bg-gradient-to-r from-orange-500 to-red-500'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(pool.progress, 100)}%` }} // Dynamic progress
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium">{pool.progress}% filled</span>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="w-3 h-3" />
                        {pool.participantCount}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {pools.map((pool) => {
            const daysRemaining = getDaysRemaining(pool.deadlineAt);
            const isAlmostFull = pool.progress >= 90;
            const isEndingSoon = daysRemaining !== null && daysRemaining <= 3;

            return (
              <Link
                key={pool.id}
                href={`/p/${pool.productId}`}
                className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all flex gap-4"
              >
                {/* Image */}
                <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {pool.image ? (
                    <img
                      src={pool.image}
                      alt={pool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {pool.title}
                      </h3>
                      <p className="text-sm text-gray-600">by {pool.supplier}</p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusBadgeColor(
                          pool.status
                        )}`}
                      >
                        {getStatusLabel(pool.status)}
                      </span>
                      {isAlmostFull && pool.status === 'OPEN' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse whitespace-nowrap">
                          🔥 Almost Full
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-3xl font-bold text-orange-600">
                        {pool.currency} {pool.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">per unit</div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              pool.progress >= 100
                                ? 'bg-green-500'
                                : pool.progress >= 90
                                ? 'bg-orange-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(pool.progress, 100)}%` }} // Dynamic progress
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 font-medium">
                        {pool.pledgedQty} / {pool.targetQty} ({pool.progress}%)
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {pool.participantCount} buyers
                      </div>
                      {pool.status === 'OPEN' && (
                        <div className="flex items-center gap-1 text-orange-600 font-medium">
                          <SyncedCountdown size="md" variant="accent" showIcon={true} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
