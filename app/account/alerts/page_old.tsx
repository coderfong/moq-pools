import React from 'react';
import { getSession } from '../../api/_lib/session';

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

  return (
    <section className="min-h-screen w-full bg-neutral-50">
      <div className="mx-auto flex-1 w-full max-w-[1400px] px-0 sm:px-0 lg:px-0 py-6 min-h-0">
        <div className="grid grid-cols-[180px_320px_1fr] lg:grid-cols-[200px_360px_1fr] border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          {/* Left: View */}
          <aside className="min-h-0 border-r border-neutral-200 bg-white p-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">View</div>
                <div className="flex flex-col gap-2">
                  <a className="w-full rounded-lg px-3 py-2 text-sm text-left bg-neutral-100 text-neutral-700 hover:bg-neutral-200" href="/account/messages">Inbox</a>
                  <button className="w-full rounded-lg px-3 py-2 text-sm text-left bg-neutral-900 text-white">Alerts</button>
                  <a className="w-full rounded-lg px-3 py-2 text-sm text-left bg-neutral-100 text-neutral-700 hover:bg-neutral-200" href="/account/orders/tracking">🚚 Order Tracking</a>
                </div>
              </div>
            </div>
          </aside>

          {/* Middle: Filters */}
          <aside className="min-h-0 flex flex-col border-r border-neutral-200 bg-white">
            <div className="p-4 border-b border-neutral-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-neutral-900" />
                  <h1 className="text-lg font-semibold tracking-tight">Alerts</h1>
                </div>
                <div className="relative">
                  <button className="rounded-lg px-2 py-1 hover:bg-neutral-100" aria-label="Notifications">🔔</button>
                </div>
              </div>
            </div>
            <nav className="border-b border-neutral-200 px-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-neutral-900 text-white">All</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-neutral-100 text-neutral-700 hover:bg-neutral-200">Group Updates</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-neutral-100 text-neutral-700 hover:bg-neutral-200">Shipping</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-neutral-100 text-neutral-700 hover:bg-neutral-200">Promotions</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-neutral-100 text-neutral-700 hover:bg-neutral-200">System</button>
              </div>
            </nav>
            <div className="px-4 py-2">
              <label htmlFor="alerts-status" className="block text-sm text-neutral-700">Status</label>
              <select id="alerts-status" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Mark all as read</button>
                <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Enable push</button>
              </div>
            </div>
            <div className="mt-auto" />
          </aside>

          {/* Right: Content */}
          <main className="min-h-0 flex flex-col bg-neutral-25">
            <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
                    <div className="flex items-start gap-3">
                      <span className="inline-block size-2 mt-1.5 rounded-full bg-neutral-300" />
                      <div>
                        <div className="font-medium text-neutral-900">No alerts yet</div>
                        <div className="mt-1">We’ll surface updates, shipping notices, and system messages here.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
