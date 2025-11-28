import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';
import { URL } from 'url';

function buildWhere(params: URLSearchParams) {
  const status = params.get('status');
  const priority = params.get('priority');
  const q = params.get('q') || '';
  const from = params.get('from');
  const to = params.get('to');

  const where: any = { type: 'SHIPPING' };
  const and: any[] = [];

  if (status === 'unread') and.push({ status: 'UNREAD' });
  if (status === 'read') and.push({ status: 'READ' });
  if (status === 'resolved') and.push({ OR: [ { triageStatus: { equals: 'RESOLVED' } }, { title: { startsWith: '[RESOLVED]', mode: 'insensitive' } } ] });
  if (status === 'archived') and.push({ OR: [ { triageStatus: { equals: 'ARCHIVED' } }, { title: { startsWith: '[ARCHIVED]', mode: 'insensitive' } } ] });
  if (priority === '1') and.push({ OR: [ { priority: { equals: true } }, { title: { contains: '[PRIORITY]', mode: 'insensitive' } } ] });
  if (q) and.push({ OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { body: { contains: q, mode: 'insensitive' } },
  ]});
  if (from) and.push({ timestamp: { gte: new Date(from) } });
  if (to) and.push({ timestamp: { lte: new Date(to) } });
  if (and.length) where.AND = and;
  return where;
}

export async function GET(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || String(me.role) !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const params = url.searchParams;
    const where = buildWhere(params);
    const limit = Math.min(5000, Math.max(1, parseInt(params.get('limit') || '2000', 10)));
    const ids = await prisma.alert.findMany({ where, select: { id: true }, orderBy: { timestamp: 'desc' }, take: limit });
    const total = await prisma.alert.count({ where });
    return NextResponse.json({ ok: true, total, ids: ids.map((x: any) => x.id) });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.alerts.ids error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
