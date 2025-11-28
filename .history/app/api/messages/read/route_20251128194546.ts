import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    if (!prisma) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
    const db: any = prisma as any;
    const threadId = String(body.threadId);
    const session = getSession();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const me = session.sub;

    // Check if user is admin or participant in conversation
    const user = await db.user.findUnique({ where: { id: me }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN';
    
    let participant = null;
    if (isAdmin) {
      // For admins, find or create participant record
      participant = await db.conversationParticipant.findFirst({
        where: { conversationId: threadId, userId: me }
      });
      if (!participant) {
        // Create participant record for admin if doesn't exist
        participant = await db.conversationParticipant.create({
          data: { conversationId: threadId, userId: me, lastReadAt: new Date() }
        });
      }
    } else {
      // For regular users, check if they're participants
      participant = await db.conversationParticipant.findFirst({
        where: { conversationId: threadId, userId: me }
      });
      if (!participant) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Update lastReadAt for this participant
    await db.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/messages/read error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}