import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || '');
    const platform = String(body?.platform || 'web');
    const userAgent = String(body?.userAgent || '');
    if (!token) return NextResponse.json({ ok: false, error: 'invalid_args' }, { status: 400 });

    const db: any = getPrisma();

    // Try update existing token; else create
    const existing = await db.pushToken.findUnique({ where: { token } });
    if (existing) {
      await db.pushToken.update({
        where: { token },
        data: { userId: session.sub, platform, userAgent, lastSeenAt: new Date() },
      });
    } else {
      await db.pushToken.create({
        data: { token, userId: session.sub, platform, userAgent: userAgent || null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
