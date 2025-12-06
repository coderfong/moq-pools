import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';
import { auth } from '@/auth';

export async function POST() {
  try {
    // Try custom session first (for traditional login)
    let session = getSession();
    let userId: string | null = null;
    
    if (session) {
      userId = session.sub;
    } else {
      // Fall back to NextAuth session (for OAuth login)
      const nextAuthSession = await auth();
      if (nextAuthSession?.user?.id) {
        userId = nextAuthSession.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark all user's notifications as read
    await prisma.alert.updateMany({
      where: {
        userId: user.id,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
