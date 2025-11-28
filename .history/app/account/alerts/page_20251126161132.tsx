import React from 'react';
import { getSession } from '../../api/_lib/session';
import { prisma } from '@/lib/prisma';
import AlertsClient from './AlertsClient';

export const dynamic = 'force-dynamic';

export default async function AccountAlertsPage() {
  const session = getSession();
  if (!session) {
    return (
      <section className="min-h-screen w-full bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold flex items-center gap-3">Alerts</h1>
          <p className="mt-2 text-sm text-neutral-600">Please sign in to view your alerts.</p>
        </div>
      </section>
    );
  }

  // Fetch alerts from database
  const alerts = prisma ? await prisma.alert.findMany({
    where: { userId: session.sub },
    orderBy: { timestamp: 'desc' },
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      status: true,
      priority: true,
      timestamp: true,
    }
  }) : [];

  return (
    <section className="min-h-screen w-full bg-gradient-to-b from-orange-50/30 to-white">
      <div className="mx-auto flex-1 w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 min-h-0">
        <div className="grid grid-cols-[140px_280px_1fr] lg:grid-cols-[160px_300px_1fr] border-2 border-orange-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
          {/* Left: View */}
          <aside className="min-h-0 border-r-2 border-orange-200/30 bg-gradient-to-b from-orange-50/20 to-white p-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide font-bold bg-gradient-to-r from-gray-700 to-orange-600 bg-clip-text text-transparent mb-3">View</div>
                <div className="flex flex-col gap-2">
                  <a className="w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-orange-200 text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 font-medium" href="/account/messages">💬 Inbox</a>
                  <button className="w-full rounded-xl px-3 py-2 text-sm text-left bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 font-semibold">🔔 Alerts</button>
                  <a className="w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-orange-200 text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 font-medium" href="/account/orders/tracking">🚚 Order Tracking</a>
                </div>
              </div>
            </div>
          </aside>

          {/* Middle: Filters */}
          <aside className="min-h-0 flex flex-col border-r-2 border-orange-200/30 bg-white">
            <div className="p-4 border-b-2 border-orange-200/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center text-xl">🔔</div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">Alerts</h1>
                </div>
              </div>
            </div>
            <nav className="border-b-2 border-orange-200/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30 font-semibold hover:scale-105 transition-all">All</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-white text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all font-medium">Group Updates</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all font-medium">Shipping</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-amber-200 bg-gradient-to-r from-amber-50/50 to-white text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all font-medium">Promotions</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-purple-200 bg-gradient-to-r from-purple-50/50 to-white text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all font-medium">System</button>
              </div>
            </nav>
            <div className="px-4 py-3">
              <label htmlFor="alerts-status" className="block text-sm font-semibold text-gray-700">Status</label>
              <select id="alerts-status" className="mt-2 w-full rounded-xl border-2 border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all">
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <div className="mt-3 flex flex-col gap-2">
                <button type="button" className="w-full rounded-xl border-2 border-orange-200 px-3 py-2 text-sm hover:bg-orange-50 hover:border-orange-300 transition-all font-medium text-gray-700">Mark all as read</button>
                <button type="button" className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-sm text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all">Enable push</button>
              </div>
            </div>
            <div className="mt-auto" />
          </aside>

          {/* Right: Content */}
          <main className="min-h-0 flex flex-col bg-gradient-to-b from-orange-50/10 to-white">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6">
                  {alerts.length === 0 ? (
                    <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-white p-8 text-sm shadow-lg">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">🔔</div>
                        <div>
                          <div className="text-lg font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">No alerts yet</div>
                          <div className="mt-2 text-gray-700">We'll surface updates, shipping notices, and system messages here. You'll be notified of pool updates, order status changes, and important announcements.</div>
                          <div className="mt-4">
                            <a href="/pools" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all">
                              Browse Products →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                          {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} 
                          {unreadCount > 0 && <span className="ml-2 text-orange-600">({unreadCount} unread)</span>}
                        </h2>
                      </div>
                      
                      {alerts.map((alert) => {
                        const isUnread = alert.status === 'UNREAD';
                        const typeConfig = {
                          GROUP_UPDATE: { icon: '👥', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' },
                          SHIPPING: { icon: '📦', color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200' },
                          PROMOTION: { icon: '🎉', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200' },
                          SYSTEM: { icon: '⚙️', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200' },
                        }[alert.type] || { icon: '🔔', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200' };

                        return (
                          <div 
                            key={alert.id}
                            className={`rounded-xl border-2 p-4 transition-all ${
                              isUnread 
                                ? `${typeConfig.border} ${typeConfig.bg} shadow-md` 
                                : 'border-gray-200 bg-white'
                            } ${alert.priority ? 'ring-2 ring-orange-300' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-2xl flex-shrink-0">{typeConfig.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {alert.title}
                                  </h3>
                                  {isUnread && (
                                    <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-orange-500" />
                                  )}
                                </div>
                                <p className={`mt-1 text-sm ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                                  {alert.body}
                                </p>
                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                                  <time dateTime={alert.timestamp.toISOString()}>
                                    {new Date(alert.timestamp).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </time>
                                  {alert.link && (
                                    <>
                                      <span>•</span>
                                      <Link 
                                        href={alert.link}
                                        className="text-orange-600 hover:text-orange-700 font-medium"
                                      >
                                        View details →
                                      </Link>
                                    </>
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
        </div>
      </div>
    </section>
  );
}
