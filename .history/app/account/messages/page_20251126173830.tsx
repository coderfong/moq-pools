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

  return <PoolMessagesClient userPools={userPools} userId={session.sub} />;
}
/*
export const metadata = { title: 'Messages - Account - MOQ Pools' };

const html = `
<!-- Messaging Screen -->
<section class="h-screen w-full bg-neutral-50 text-neutral-900">
  <div class="mx-auto h-full max-w-[1400px] grid grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">

    <!-- Sidebar -->
    <aside class="flex flex-col border-r border-neutral-200 bg-white">
      <!-- Brand / Search -->
      <div class="p-4 border-b border-neutral-200">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-xl bg-neutral-900"></div>
          <h1 class="text-lg font-semibold tracking-tight">Inbox</h1>
        </div>
        <label class="mt-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 focus-within:ring-2 focus-within:ring-neutral-900">
          <svg class="size-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" stroke-width="1.5"/><path d="m20 20-3.5-3.5" stroke-width="1.5"/></svg>
          <input placeholder="Search" class="w-full bg-transparent outline-none placeholder:text-neutral-400"/>
        </label>
      </div>

      <!-- Filters -->
      <nav class="px-2 py-2 border-b border-neutral-200">
        <ul class="flex items-center gap-2">
          <li>
            <button class="px-3 py-1.5 rounded-full bg-neutral-900 text-white text-sm">All</button>
          </li>
          <li>
            <button class="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm hover:bg-neutral-200">Unread</button>
          </li>
        import MessagesClient from './MessagesClient';

        export const metadata = { title: 'Messages - Account - MOQ Pools' };

        export default function Page() {
          return <MessagesClient />;
        }
          <li class="cursor-pointer hover:bg-neutral-50">
*/
