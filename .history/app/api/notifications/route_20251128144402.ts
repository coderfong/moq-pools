import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export async function GET(request: Request) {
  try {
    const session = getSession();

    if (!session?.sub) {
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    const session = getSession();

    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notificationId, alertIds, markAsRead } = body;

    // Support both single notificationId and bulk alertIds
    if (!notificationId && (!alertIds || alertIds.length === 0)) {
      return NextResponse.json(
        { error: 'notificationId or alertIds is required' },
        { status: 400 }
      );
    }

    if (alertIds && Array.isArray(alertIds) && alertIds.length > 0) {
      // Bulk update - mark multiple alerts as read
      const result = await prisma.alert.updateMany({
        where: {
          id: { in: alertIds },
          userId: user.id, // Ensure user owns these notifications
        },
        data: {
          status: markAsRead !== false ? 'READ' : 'UNREAD',
        },
      });

      console.log(`[NOTIFICATIONS] Marked ${result.count} alerts as read for user ${user.id}`);
      return NextResponse.json({ success: true, count: result.count });
    } else {
      // Single update
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
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
