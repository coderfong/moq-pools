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

          {/* Client Component handles filters and content */}
          <AlertsClient initialAlerts={alerts} />
        </div>
      </div>
    </section>
  );
}
