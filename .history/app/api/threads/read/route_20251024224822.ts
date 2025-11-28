import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const db: any = getPrisma();
    const body = await req.json().catch(() => ({}));
    const threadId = String(body?.threadId || '');
    if (!threadId) return NextResponse.json({ ok: false, error: 'invalid_args' }, { status: 400 });

    const isMember = await db.conversationParticipant.findFirst({ where: { conversationId: threadId, userId: session.sub } });
    if (!isMember) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    await db.conversationParticipant.updateMany({
      where: { conversationId: threadId, userId: session.sub },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
