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
    <section className="h-screen w-full bg-neutral-50">
      <PoolMessagesClient userPools={userPools} userId={session.sub} />
    </section>
  );
}
