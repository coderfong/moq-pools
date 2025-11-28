import React from "react";
import { getSession } from "../../../api/_lib/session";
import { getPrisma } from "@/lib/prisma";
import PoolItemTrackingClient from "./ui/PoolItemTrackingClient";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage() {
  const session = getSession();
  let poolItems: any[] = [];
  let hasDb = true;

  if (!session) {
    return (
      <section className="min-h-screen w-full bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold flex items-center gap-3">🚚 Order Tracking</h1>
          <p className="mt-2 text-sm text-neutral-600">Please sign in to view your orders and track them from pool to delivery.</p>
        </div>
      </section>
    );
  }

  try {
    const prisma: any = getPrisma();
    // Ensure user exists
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, email: true, name: true } });
    if (me) {
      poolItems = await prisma.poolItem.findMany({
        where: { userId: me.id },
        include: {
          pool: {
            select: {
              id: true,
              product: { 
                select: { 
                  id: true, 
                  title: true, 
                  imagesJson: true 
                } 
              },
            },
          },
          payment: { 
            select: { 
              id: true, 
              status: true, 
              amount: true, 
              currency: true, 
              paidAt: true 
            } 
          },
          shipment: {
            select: {
              id: true,
              carrier: true,
              trackingNo: true,
              status: true,
              shippedAt: true,
              deliveredAt: true
            }
          },
          statusHistory: {
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              notes: true,
              automated: true,
              createdAt: true,
              triggeredBy: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }
  } catch (e: any) {
    hasDb = false;
    console.error('Failed to fetch pool items:', e);
  }

  return (
    <section className="min-h-screen w-full bg-gradient-to-b from-emerald-50/30 to-white">
      <div className="mx-auto flex-1 w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 min-h-0">
        <div className="grid grid-cols-[140px_240px_1fr] lg:grid-cols-[160px_260px_1fr] border-2 border-emerald-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
          {/* Left: View */}
          <aside className="min-h-0 border-r-2 border-emerald-200/30 bg-gradient-to-b from-emerald-50/20 to-white p-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide font-bold bg-gradient-to-r from-gray-700 to-emerald-600 bg-clip-text text-transparent mb-3">View</div>
                <div className="flex flex-col gap-2">
                  <a className="w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-emerald-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 font-medium" href="/account/messages">💬 Inbox</a>
                  <a className="w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-emerald-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 font-medium" href="/account/alerts">🔔 Alerts</a>
                  <a className="w-full rounded-xl px-3 py-2 text-sm text-left bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 font-semibold" href="/account/orders/tracking">🚚 Order Tracking</a>
                </div>
              </div>
            </div>
          </aside>

          {/* Middle: Filters / Status */}
          <aside className="min-h-0 flex flex-col border-r-2 border-emerald-200/30 bg-white">
            <div className="p-4 border-b-2 border-emerald-200/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-xl">🚚</div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-emerald-600 bg-clip-text text-transparent">Tracking</h1>
                </div>
              </div>
            </div>
            <nav className="border-b-2 border-emerald-200/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm relative bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30 font-semibold hover:scale-105 transition-all">All</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-white text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all font-medium">Preparing</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-amber-200 bg-gradient-to-r from-amber-50/50 to-white text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all font-medium">Shipping</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all font-medium">Delivered</button>
                <button className="px-3 py-1.5 rounded-full text-sm relative border-2 border-red-200 bg-gradient-to-r from-red-50/50 to-white text-red-700 hover:bg-red-100 hover:border-red-300 transition-all font-medium">Issues</button>
              </div>
            </nav>
            <div className="px-4 py-3">
              <label htmlFor="tracking-status" className="block text-sm font-semibold text-gray-700">Status</label>
              <select id="tracking-status" className="mt-2 w-full rounded-xl border-2 border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <div className="mt-3 flex flex-col gap-2">
                <button type="button" className="w-full rounded-xl border-2 border-emerald-200 px-3 py-2 text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-all font-medium text-gray-700">Mark all as read</button>
                <button type="button" className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-2 text-sm text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all">Enable push</button>
              </div>
            </div>
            <div className="mt-auto" />
          </aside>

          {/* Right: Content - Comprehensive Pool Item Tracking */}
          <main className="min-h-0 flex flex-col bg-gradient-to-b from-emerald-50/10 to-white col-span-2">
            <PoolItemTrackingClient poolItems={poolItems} />
          </main>
        </div>
      </div>
    </section>
  );
}
