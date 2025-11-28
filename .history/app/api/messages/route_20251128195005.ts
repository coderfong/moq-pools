import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';
import { isRateLimited, rateLimitHeaders } from '../_lib/rateLimit';

// Minimal plain-text sanitizer to avoid ESM-only dependencies server-side.
function sanitizeText(raw: string) {
  const s = String(raw || '').slice(0, 5000); // cap length
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

export async function GET(request: Request) {
  // Admin messages API - GET endpoint
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    if (!threadId) {
      return NextResponse.json({ error: 'threadId required' }, { status: 400 });
    }
    if (!prisma) return NextResponse.json({ messages: [] }, { status: 503 });
    const db: any = prisma as any;
    const session = getSession();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const me = session.sub;
    
    // Check if user is admin or participant in conversation
    const user = await db.user.findUnique({ where: { id: me }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN';
    
    console.log('GET /api/messages - User:', me, 'isAdmin:', isAdmin);
    
    if (!isAdmin) {
      const isMember = await db.conversationParticipant.findFirst({ 
        where: { conversationId: threadId, userId: me } 
      });
      if (!isMember) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    
    const exists = await db.conversation.findUnique({ where: { id: threadId } });
    if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 });
    
    // Get messages with user details
    const rows = await db.message.findMany({
      where: { conversationId: threadId },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });
    
    const messages = rows.map((m: any) => ({
      id: m.id,
      threadId,
      text: m.text,
      createdAt: new Date(m.createdAt).getTime(),
      user: {
        id: m.senderUser?.id || m.senderUserId,
        name: m.senderUser?.name,
        email: m.senderUser?.email,
        role: m.senderUser?.role || 'USER',
      }
    }));
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'internal_error', messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.threadId || !body.text) {
      return NextResponse.json({ error: 'threadId and text are required' }, { status: 400 });
    }
    if (!prisma) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
    const db: any = prisma as any;
    const threadId = String(body.threadId);
    const rawText = String(body.text);
    const session = getSession();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const me = session.sub;

    // Rate limit: 10/min per user
    const rlKey = `msg:${me}`;
    const { limited, remaining } = isRateLimited(rlKey, 10, 60_000);
    if (limited) {
      return new NextResponse(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'content-type': 'application/json', ...rateLimitHeaders(10, remaining, 60_000) },
      });
    }

    // Sanitize text to prevent XSS in any potential HTML renderers; keep plain-text style
    const text = sanitizeText(rawText);
    
    // Check if user is admin or participant in conversation
    const user = await db.user.findUnique({ where: { id: me }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN';
    
    console.log('POST /api/messages - User:', me, 'isAdmin:', isAdmin);
    
    if (!isAdmin) {
      const isMember = await db.conversationParticipant.findFirst({ where: { conversationId: threadId, userId: me } });
      if (!isMember) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // Get user details for response
    const user = await db.user.findUnique({
      where: { id: me },
      select: { id: true, name: true, email: true, role: true }
    });
    
    // create message
    const msg = await db.message.create({
      data: {
        conversationId: threadId,
        sender: null,
        senderUserId: me,
        text,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });
    
    // update conversation preview/updatedAt
    await db.conversation.update({
      where: { id: threadId },
      data: { preview: rawText, updatedAt: new Date() },
    });

    return NextResponse.json({ 
      message: { 
        id: msg.id, 
        threadId, 
        text, 
        createdAt: Date.now(),
        user: msg.senderUser || user
      } 
    }, { status: 201, headers: rateLimitHeaders(10, remaining, 60_000) });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
