import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getPrisma } from '@/lib/prisma';
import { emitEvent, DomainEvent } from '@/lib/alerts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma = getPrisma();
    const me = await (prisma as any).user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const body = (await req.json()) as DomainEvent | DomainEvent[];
    const events = Array.isArray(body) ? body : [body];
    for (const ev of events) {
      await emitEvent(ev);
    }
    return NextResponse.json({ ok: true, processed: events.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'bad_request' }, { status: 400 });
  }
}
