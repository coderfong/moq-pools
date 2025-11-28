import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || String(me.role) !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });
    const result = await prisma.alert.updateMany({ where: { id: { in: ids } }, data: { status: 'READ' } });
    return NextResponse.json({ ok: true, updated: Number(result?.count ?? 0) });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.alerts.read error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
