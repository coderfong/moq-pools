import { getSession } from "../../api/_lib/session";
import { getPrisma } from "@/lib/prisma";
import PoolMessagesClient from './PoolMessagesClient';

export const metadata = { title: 'Messages - Account - MOQ Pools' };
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = getSession();
  
  if (!session) {
    return (
      <section className="min-h-screen w-full bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold flex items-center gap-3">💬 Messages</h1>
          <p className="mt-2 text-sm text-neutral-600">Please sign in to view your messages.</p>
        </div>
      </section>
    );
  }

  let userPools: any[] = [];
  
  try {
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true } });
    
    if (me) {
      // Get all pools the user has joined
      userPools = await prisma.poolItem.findMany({
        where: { userId: me.id },
        select: {
          pool: {
            select: {
              id: true,
              status: true,
              targetQty: true,
              pledgedQty: true,
              deadlineAt: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  imagesJson: true,
                },
              },
              conversations: {
                where: {
                  participants: { some: { userId: me.id } },
                },
                select: {
                  id: true,
                  updatedAt: true,
                  messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                      id: true,
                      text: true,
                      createdAt: true,
                      senderUserId: true,
                    },
                  },
                  participants: {
                    where: { userId: me.id },
                    select: { lastReadAt: true },
                  },
                },
              },
            },
          },
        },
        distinct: ['poolId'],
        orderBy: { createdAt: 'desc' },
      });
    }
  } catch (err) {
    console.error('Failed to load user pools:', err);
  }

  return (
    <section className="h-screen w-full bg-neutral-50 flex">
      {/* Left Navigation - Account Tabs */}
      <aside className="w-20 border-r border-neutral-200 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center py-6 gap-4">
        <a
          href="/account/messages"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-emerald-100 text-emerald-700"
          title="Messages"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">Messages</span>
          {userPools.some((p: any) => {
            const conv = p.pool.conversations[0];
            if (!conv) return false;
            const lastMsg = conv.messages[0];
            const lastReadAt = conv.participants[0]?.lastReadAt;
            return lastMsg && (!lastReadAt || new Date(lastMsg.createdAt) > new Date(lastReadAt));
          }) && (
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          )}
        </a>

        <a
          href="/account/alerts"
          className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          title="Alerts"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs font-medium">Alerts</span>
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
      <div className="flex-1 flex">
        <PoolMessagesClient userPools={userPools} userId={session.sub} />
      </div>
    </section>
  );
}
