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
      poolId: true,
      productName: true,
    }
  }) : [];

  return (
    <section className="min-h-screen w-full bg-gradient-to-b from-orange-50/30 to-white flex">
      {/* Left Navigation - Account Tabs */}
      <aside className="w-20 border-r border-neutral-200 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center py-6 gap-4">
        <a
          href="/account/messages"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          title="Messages"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">Messages</span>
        </a>

        <a
          href="/account/alerts"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-orange-100 text-orange-700"
          title="Alerts"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs font-medium">Alerts</span>
          {alerts.filter((a: any) => a.status === 'UNREAD').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
              {alerts.filter((a: any) => a.status === 'UNREAD').length}
            </span>
          )}
        </a>

        <a
          href="/account/orders/tracking"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          title="Order Tracking"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-xs font-medium">Tracking</span>
        </a>
      </aside>

      {/* Main Content */}
      <div className="flex-1 mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] border-2 border-orange-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
          {/* Client Component handles filters and content */}
          <AlertsClient initialAlerts={alerts} />
        </div>
      </div>
    </section>
  );
}
