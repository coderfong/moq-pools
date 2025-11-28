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
              status: true,
              targetQty: true,
              pledgedQty: true,
              deadlineAt: true,
              moqReachedAt: true,
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
              etaDate: true,
              createdAt: true,
              updatedAt: true
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
        <div className="grid grid-cols-[140px_1fr] lg:grid-cols-[160px_1fr] border-2 border-emerald-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
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

          {/* Right: Content - Comprehensive Pool Item Tracking */}
          <main className="min-h-0 flex flex-col bg-gradient-to-b from-emerald-50/10 to-white">
            <PoolItemTrackingClient poolItems={poolItems} />
          </main>
        </div>
      </div>
    </section>
  );
}
