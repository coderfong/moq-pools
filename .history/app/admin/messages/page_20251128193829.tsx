import { getSession } from "../../api/_lib/session";
import { redirect } from 'next/navigation';
import { getPrisma } from "@/lib/prisma";
import AdminPoolMessagesClient from './AdminPoolMessagesClient';

export const metadata = {
  title: 'Pool Support Messages - Admin - MOQ Pools',
};

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const prisma: any = getPrisma();
  const session = getSession();

  // Check if user is admin
  if (!session?.sub) {
    redirect('/auth/signin');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.sub },
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
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Get message counts and last messages for each conversation
  const conversationsWithMessages = await Promise.all(
    poolConversations.map(async (conv: any) => {
      const messages = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
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
      });

      const messageCount = await prisma.message.count({
        where: { conversationId: conv.id },
      });

      return { ...conv, messages, messageCount };
    })
  );

  // Format conversations for client
  const formattedConversations = conversationsWithMessages.map((conv: any) => {
    // Get the non-admin participant (the user)
    const userParticipant = conv.participants.find((p: any) => p.user.role !== 'ADMIN');
    const lastMessage = conv.messages[0];

    // Get admin's lastReadAt
    const adminParticipant = conv.participants.find((p: any) => p.user.role === 'ADMIN');
    const isUnread = lastMessage && adminParticipant
      ? (!adminParticipant.lastReadAt || new Date(lastMessage.createdAt) > new Date(adminParticipant.lastReadAt))
      : false;

    // Check if needs reply (last message was from user)
    const needsReply = lastMessage ? lastMessage.senderUser.role !== 'ADMIN' : false;

    return {
      id: conv.id,
      poolId: conv.poolId!,
      poolTitle: conv.pool?.product?.title || 'Unknown Pool',
      poolStatus: conv.pool?.status || 'PENDING',
      poolImage: conv.pool?.product?.images?.[0] || null,
      user: userParticipant?.user || null,
      lastMessage: lastMessage ? {
        text: lastMessage.text,
        createdAt: lastMessage.createdAt.toISOString(),
        senderName: lastMessage.senderUser.name || lastMessage.senderUser.email,
        isAdmin: lastMessage.senderUser.role === 'ADMIN',
      } : null,
      messageCount: conv.messageCount,
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
