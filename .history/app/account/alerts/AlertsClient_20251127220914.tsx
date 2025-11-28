'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type AlertType = 'GROUP_UPDATE' | 'SHIPPING' | 'PROMOTION' | 'SYSTEM' | 'PAYMENT' | 'ORDER' | 'ACCOUNT';
type AlertStatus = 'UNREAD' | 'READ';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  link: string | null;
  status: AlertStatus;
  priority: boolean | null;
  timestamp: Date;
  poolId: string | null;
  productName: string | null;
}

interface AlertsClientProps {
  initialAlerts: Alert[];
}

const ALERT_CONFIG = {
  GROUP_UPDATE: {
    icon: '👥',
    label: 'Group Updates',
    color: 'blue',
    bg: 'bg-blue-50/80',
    border: 'border-blue-200',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-100',
    activeBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    activeText: 'text-white',
  },
  SHIPPING: {
    icon: '📦',
    label: 'Shipping',
    color: 'purple',
    bg: 'bg-purple-50/80',
    border: 'border-purple-200',
    text: 'text-purple-700',
    hoverBg: 'hover:bg-purple-100',
    activeBg: 'bg-gradient-to-r from-purple-500 to-purple-600',
    activeText: 'text-white',
  },
  PROMOTION: {
    icon: '🎉',
    label: 'Promotions',
    color: 'amber',
    bg: 'bg-amber-50/80',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hoverBg: 'hover:bg-amber-100',
    activeBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    activeText: 'text-white',
  },
  SYSTEM: {
    icon: '⚙️',
    label: 'System',
    color: 'gray',
    bg: 'bg-gray-50/80',
    border: 'border-gray-200',
    text: 'text-gray-700',
    hoverBg: 'hover:bg-gray-100',
    activeBg: 'bg-gradient-to-r from-gray-500 to-gray-600',
    activeText: 'text-white',
  },
  PAYMENT: {
    icon: '💳',
    label: 'Payments',
    color: 'emerald',
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-100',
    activeBg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    activeText: 'text-white',
  },
  ORDER: {
    icon: '📋',
    label: 'Orders',
    color: 'pink',
    bg: 'bg-pink-50/80',
    border: 'border-pink-200',
    text: 'text-pink-700',
    hoverBg: 'hover:bg-pink-100',
    activeBg: 'bg-gradient-to-r from-pink-500 to-pink-600',
    activeText: 'text-white',
  },
  ACCOUNT: {
    icon: '👤',
    label: 'Account',
    color: 'cyan',
    bg: 'bg-cyan-50/80',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    hoverBg: 'hover:bg-cyan-100',
    activeBg: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
    activeText: 'text-white',
  },
};

export default function AlertsClient({ initialAlerts }: AlertsClientProps) {
  const [alerts, setAlerts] = useState<Alert[]>(
    initialAlerts.map(a => ({
      ...a,
      timestamp: new Date(a.timestamp),
    }))
  );
  const [filterType, setFilterType] = useState<AlertType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10); // Show 10 alerts initially

  // Get unique product names for filter
  const uniqueProducts = useMemo(() => {
    const products = alerts
      .filter(a => a.productName)
      .map(a => a.productName!)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return products;
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const typeMatch = filterType === 'ALL' || alert.type === filterType;
      const statusMatch = 
        filterStatus === 'all' || 
        (filterStatus === 'unread' && alert.status === 'UNREAD') ||
        (filterStatus === 'read' && alert.status === 'READ');
      const productMatch = filterProduct === 'all' || alert.productName === filterProduct;
      return typeMatch && statusMatch && productMatch;
    });
  }, [alerts, filterType, filterStatus, filterProduct]);

  // Paginated alerts for display
  const visibleAlerts = useMemo(() => {
    return filteredAlerts.slice(0, visibleCount);
  }, [filteredAlerts, visibleCount]);

  const hasMore = filteredAlerts.length > visibleCount;

  const unreadCount = alerts.filter(a => a.status === 'UNREAD').length;

  // Mark individual alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId] }),
      });

      if (response.ok) {
        setAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, status: 'READ' as AlertStatus } : a
        ));
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = alerts.filter(a => a.status === 'UNREAD').map(a => a.id);
    if (unreadIds.length === 0) return;

    setIsMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: unreadIds }),
      });

      if (response.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, status: 'READ' as AlertStatus })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Enable push notifications
  const enablePush = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsPushEnabled(true);
        // Show success notification
        new Notification('PoolBuy Notifications Enabled', {
          body: 'You will now receive push notifications for important updates',
          icon: '/favicon.ico',
        });
      } else {
        alert('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      alert('Failed to enable notifications');
    }
  };

  return (
    <>
      {/* Middle: Filters */}
      <aside className="min-h-0 flex flex-col border-r-2 border-orange-200/30 bg-white">
        <div className="p-4 border-b-2 border-orange-200/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center text-xl">
                🔔
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">
                  Alerts
                </h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-orange-600 font-semibold">{unreadCount} unread</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Type Filters */}
        <nav className="border-b-2 border-orange-200/30 px-4 py-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left ${
                filterType === 'ALL'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'border-2 border-orange-200 text-gray-700 hover:bg-orange-50'
              }`}
            >
              All Notifications
            </button>
            {(Object.keys(ALERT_CONFIG) as AlertType[]).map((type) => {
              const config = ALERT_CONFIG[type];
              const count = alerts.filter(a => a.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left flex items-center justify-between ${
                    filterType === type
                      ? `${config.activeBg} ${config.activeText} shadow-md`
                      : `border-2 ${config.border} ${config.text} ${config.hoverBg}`
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </span>
                  {count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      filterType === type ? 'bg-white/20' : config.bg
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
        
        {/* Status Filter */}
        <div className="px-4 py-3 border-b-2 border-orange-200/30">
          <label htmlFor="alerts-status" className="block text-sm font-semibold text-gray-700 mb-2">
            Status
          </label>
          <select
            id="alerts-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'unread' | 'read')}
            className="w-full rounded-xl border-2 border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          >
            <option value="all">All ({alerts.length})</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="read">Read ({alerts.length - unreadCount})</option>
          </select>
        </div>

        {/* Product/Pool Filter */}
        {uniqueProducts.length > 0 && (
          <div className="px-4 py-3 border-b-2 border-orange-200/30">
            <label htmlFor="alerts-product" className="block text-sm font-semibold text-gray-700 mb-2">
              Product/Pool
            </label>
            <select
              id="alerts-product"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full rounded-xl border-2 border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">All Products ({alerts.filter(a => a.productName).length})</option>
              {uniqueProducts.map((product) => {
                const count = alerts.filter(a => a.productName === product).length;
                return (
                  <option key={product} value={product}>
                    {product.length > 25 ? `${product.substring(0, 25)}...` : product} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || isMarkingAllRead}
              className="w-full rounded-xl border-2 border-orange-200 px-3 py-2 text-sm hover:bg-orange-50 hover:border-orange-300 transition-all font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMarkingAllRead ? 'Marking...' : 'Mark all as read'}
            </button>
            <button
              type="button"
              onClick={enablePush}
              disabled={isPushEnabled}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-sm text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPushEnabled ? '✓ Push Enabled' : 'Enable Push'}
            </button>
          </div>
        </div>
        <div className="mt-auto" />
      </aside>

      {/* Right: Content */}
      <main className="min-h-0 flex flex-col bg-gradient-to-b from-orange-50/10 to-white">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6">
              {filteredAlerts.length === 0 ? (
                <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-white p-8 text-sm shadow-lg">
                  <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/30">
                      {filterType === 'ALL' ? '🔔' : ALERT_CONFIG[filterType as AlertType]?.icon || '🔔'}
                    </div>
                    <div>
                      <div className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">
                        {filterStatus === 'unread' && unreadCount === 0
                          ? 'All caught up!'
                          : filterType === 'ALL'
                          ? 'No alerts yet'
                          : `No ${ALERT_CONFIG[filterType as AlertType]?.label.toLowerCase() || 'alerts'}`}
                      </div>
                      <div className="mt-2 text-gray-700">
                        {filterStatus === 'unread' && unreadCount === 0
                          ? "You've read all your notifications. Great job staying on top of things!"
                          : "We'll notify you of pool updates, order status changes, and important announcements."}
                      </div>
                      {filterType === 'ALL' && alerts.length === 0 && (
                        <div className="mt-4">
                          <Link
                            href="/pools"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all"
                          >
                            Browse Products →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-gray-600">
                      Showing {visibleAlerts.length} of {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                      {filteredAlerts.length !== alerts.length && ` (filtered from ${alerts.length} total)`}
                    </h2>
                  </div>

                  {visibleAlerts.map((alert) => {
                    const isUnread = alert.status === 'UNREAD';
                    const config = ALERT_CONFIG[alert.type];

                    return (
                      <div
                        key={alert.id}
                        className={`group rounded-2xl border-2 p-5 transition-all relative overflow-hidden ${
                          isUnread
                            ? `${config.border} ${config.bg} shadow-md hover:shadow-lg`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        } ${alert.priority ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
                      >
                        {/* Priority indicator */}
                        {alert.priority && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-bl-xl">
                            PRIORITY
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                            isUnread ? `${config.bg} ${config.border} border-2` : 'bg-gray-100'
                          }`}>
                            {config.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className={`text-base font-bold leading-tight ${
                                isUnread ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {alert.title}
                              </h3>
                              {isUnread && (
                                <div className="flex-shrink-0 flex items-center gap-2">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                                  <button
                                    onClick={() => markAsRead(alert.id)}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                                  >
                                    Mark read
                                  </button>
                                </div>
                              )}
                            </div>

                            <p className={`text-sm leading-relaxed mb-3 ${
                              isUnread ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {alert.body}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-lg font-medium ${config.bg} ${config.text}`}>
                                  {config.label}
                                </span>
                                <time
                                  dateTime={alert.timestamp.toISOString()}
                                  className="text-gray-500"
                                >
                                  {new Date(alert.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </time>
                              </div>
                              {alert.link && (
                                <Link
                                  href={alert.link}
                                  className="ml-auto inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold hover:gap-2 transition-all"
                                >
                                  View details
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
