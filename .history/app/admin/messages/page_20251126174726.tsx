import { getSession } from "../../api/_lib/session";
import { redirect } from 'next/navigation';
import { getPrisma } from "@/lib/prisma";
import AdminPoolMessagesClient from './AdminPoolMessagesClient';

export const metadata = {
  title: 'Pool Support Messages - Admin - MOQ Pools',
};

export default async function AdminMessagesPage() {
  const prisma = getPrisma();
  const session = await getSession();

  // Check if user is admin
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch all pool conversations with user details
  const poolConversations = await prisma.conversation.findMany({
    where: {
      poolId: { not: null },
    },
    include: {
      pool: {
        include: {
          product: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Format conversations for client
  const formattedConversations = poolConversations.map((conv) => {
    // Get the non-admin participant (the user)
    const userParticipant = conv.participants.find(p => p.user.role !== 'ADMIN');
    const lastMessage = conv.messages[0];

    // Get admin's lastReadAt
    const adminParticipant = conv.participants.find(p => p.user.role === 'ADMIN');
    const isUnread = lastMessage && adminParticipant
      ? (!adminParticipant.lastReadAt || new Date(lastMessage.createdAt) > new Date(adminParticipant.lastReadAt))
      : false;

    // Check if needs reply (last message was from user)
    const needsReply = lastMessage ? lastMessage.sender.role !== 'ADMIN' : false;

    return {
      id: conv.id,
      poolId: conv.poolId!,
      poolTitle: conv.pool?.product?.title || 'Unknown Pool',
      poolStatus: conv.pool?.status || 'PENDING',
      poolImage: conv.pool?.product?.images?.[0] || null,
      user: userParticipant?.user || null,
      lastMessage: lastMessage ? {
        text: lastMessage.content,
        createdAt: lastMessage.createdAt.toISOString(),
        senderName: lastMessage.sender.name || lastMessage.sender.email,
        isAdmin: lastMessage.sender.role === 'ADMIN',
      } : null,
      messageCount: conv._count.messages,
      isUnread,
      needsReply,
      updatedAt: conv.updatedAt.toISOString(),
    };
  });

  // Calculate stats
  const stats = {
    total: formattedConversations.length,
    unread: formattedConversations.filter(c => c.isUnread).length,
    needsReply: formattedConversations.filter(c => c.needsReply).length,
  };

  return (
    <AdminPoolMessagesClient
      initialConversations={formattedConversations}
      initialStats={stats}
      adminId={currentUser.id}
    />
  );
}
