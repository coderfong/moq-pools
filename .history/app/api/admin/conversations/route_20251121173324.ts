import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, email: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, unread, unanswered
    const search = searchParams.get('search') || '';

    // Get all conversations with latest message and participant info
    const conversations = await prisma.conversation.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            senderUser: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Process conversations to add metadata
    const processedConversations = conversations.map((conv) => {
      const latestMessage = conv.messages[0];
      const userParticipant = conv.participants.find((p) => p.user.role !== 'ADMIN');
      const adminParticipant = conv.participants.find((p) => p.user.role === 'ADMIN');

      // Check if admin has replied
      const hasAdminReply = latestMessage?.senderUser?.role === 'ADMIN';
      
      // Check for unread (if lastReadAt is before latest message)
      const isUnread = adminParticipant?.lastReadAt 
        ? new Date(adminParticipant.lastReadAt) < new Date(conv.updatedAt)
        : true;

      return {
        id: conv.id,
        title: conv.title,
        company: conv.company,
        avatarUrl: conv.avatarUrl,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
        messageCount: conv._count.messages,
        latestMessage: latestMessage
          ? {
              text: latestMessage.text,
              createdAt: latestMessage.createdAt,
              senderName: latestMessage.senderUser?.name || latestMessage.senderUser?.email || 'Unknown',
              isAdmin: latestMessage.senderUser?.role === 'ADMIN',
            }
          : null,
        user: userParticipant
          ? {
              id: userParticipant.user.id,
              email: userParticipant.user.email,
              name: userParticipant.user.name,
            }
          : null,
        isUnread,
        needsReply: !hasAdminReply,
      };
    });

    // Apply filters
    let filtered = processedConversations;

    if (filter === 'unread') {
      filtered = filtered.filter((c) => c.isUnread);
    } else if (filter === 'unanswered') {
      filtered = filtered.filter((c) => c.needsReply);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.user?.email.toLowerCase().includes(searchLower) ||
          c.user?.name?.toLowerCase().includes(searchLower) ||
          c.title?.toLowerCase().includes(searchLower) ||
          c.latestMessage?.text.toLowerCase().includes(searchLower)
      );
    }

    // Calculate stats
    const stats = {
      total: processedConversations.length,
      unread: processedConversations.filter((c) => c.isUnread).length,
      needsReply: processedConversations.filter((c) => c.needsReply).length,
    };

    return NextResponse.json({
      conversations: filtered,
      stats,
    });
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark conversation as read
export async function PATCH(req: NextRequest) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    // Update admin participant's lastReadAt
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: session.sub,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
