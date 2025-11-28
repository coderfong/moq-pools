import React from "react";
import { getSession } from "../../../api/_lib/session";
import { getPrisma } from "@/lib/prisma";
import PoolItemTrackingClient from "./ui/PoolItemTrackingClient";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage() {
  const session = getSession();
  let poolItems: any[] = [];
  let hasDb = true;
  let unreadMessagesCount = 0;
  let unreadAlertsCount = 0;

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
      // Check unread messages
      const recentMessages = await prisma.poolMessage.findMany({
        where: {
          pool: {
            items: {
              some: { userId: me.id }
            }
          },
          senderUserId: { not: me.id }
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      if (recentMessages.length > 0 && (!me.lastReadAt || recentMessages[0].createdAt > me.lastReadAt)) {
        unreadMessagesCount = 1;
      }

      // Check unread alerts
      unreadAlertsCount = await prisma.userAlert.count({
        where: {
          userId: me.id,
          status: 'UNREAD'
        }
      });

      // Fetch pool items
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
    <section className="min-h-screen w-full bg-gradient-to-b from-emerald-50/30 to-white flex">
      {/* Left Navigation - Account Tabs */}
      <aside className="w-20 border-r border-neutral-200 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center py-6 gap-4">
        <a
          href="/account/messages"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all relative"
          title="Messages"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">Messages</span>
          {unreadMessagesCount > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></div>
          )}
        </a>

        <a
          href="/account/alerts"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all relative"
          title="Alerts"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs font-medium">Alerts</span>
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-500 rounded-full min-w-[18px] text-center">
              {unreadAlertsCount}
            </span>
          )}
        </a>

        <a
          href="/account/orders/tracking"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-blue-100 text-blue-700"
          title="Order Tracking"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-xs font-medium">Tracking</span>
          {poolItems.filter((item: any) => 
            ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(item.poolItemStatus)
          ).length > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
          )}
        </a>
      </aside>

      {/* Main Content */}
      <div className="flex-1 mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-2 border-emerald-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
          <main className="min-h-0 flex flex-col bg-gradient-to-b from-emerald-50/10 to-white">
            <PoolItemTrackingClient poolItems={poolItems} />
          </main>
        </div>
      </div>
    </section>
  );
}
