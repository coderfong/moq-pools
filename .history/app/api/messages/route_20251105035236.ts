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
    const isMember = await db.conversationParticipant.findFirst({ where: { conversationId: threadId, userId: me } });
    if (!isMember) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const exists = await db.conversation.findUnique({ where: { id: threadId } });
    if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const rows = await db.message.findMany({
      where: { conversationId: threadId },
      orderBy: { createdAt: 'asc' },
    });
    const messages = rows.map((m: any) => ({
      id: m.id,
      threadId,
      sender: m.sender ? (m.sender as 'me' | 'them') : (m.senderUserId && me && m.senderUserId === me ? 'me' : 'them'),
      text: m.text,
      createdAt: new Date(m.createdAt).getTime(),
    }));
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'internal_error', messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
  const isMember = await db.conversationParticipant.findFirst({ where: { conversationId: threadId, userId: me } });
  if (!isMember) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  // create message
  const msg = await db.message.create({
    data: {
      conversationId: threadId,
      sender: me ? null : 'me',
      senderUserId: me,
      text,
    },
  });
  // update conversation preview/updatedAt
  await db.conversation.update({
    where: { id: threadId },
    data: { preview: rawText, updatedAt: new Date() },
  });

  return NextResponse.json({ message: { id: msg.id, threadId, sender: 'me', text, createdAt: Date.now() } }, { status: 201, headers: rateLimitHeaders(10, remaining, 60_000) });
}
