import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export async function GET(request: Request) {
  try {
    const session = getSession();
    console.log('[NOTIFICATIONS] Session:', session ? { sub: session.sub, email: session.email } : null);

    if (!session?.sub) {
      console.log('[NOTIFICATIONS] No session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find user by ID (from session)
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true },
    });

    if (!user) {
      console.log('[NOTIFICATIONS] User not found:', session.sub);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[NOTIFICATIONS] User found:', user.id);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Fetch alerts (notifications) for the user
    const alerts = await prisma.alert.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { status: 'UNREAD' } : {}),
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        status: true,
        timestamp: true,
      },
    });

    // Get unread count
    const unreadCount = await prisma.alert.count({
      where: {
        userId: user.id,
        status: 'UNREAD',
      },
    });

    return NextResponse.json({
      notifications: alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.body,
        link: alert.link,
        read: alert.status === 'READ',
        timestamp: alert.timestamp.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notificationId, markAsRead } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    // Update notification status
    await prisma.alert.update({
      where: {
        id: notificationId,
        userId: user.id, // Ensure user owns this notification
      },
      data: {
        status: markAsRead ? 'READ' : 'UNREAD',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
