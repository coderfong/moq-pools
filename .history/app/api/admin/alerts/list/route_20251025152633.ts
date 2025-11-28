import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

function buildWhere(params: URLSearchParams) {
  const status = params.get('status'); // all|unread|read|resolved|archived
  const priority = params.get('priority'); // '1' to filter
  const q = params.get('q') || '';
  const from = params.get('from');
  const to = params.get('to');

  const where: any = { type: 'SHIPPING' };
  const and: any[] = [];

  if (status === 'unread') and.push({ status: 'UNREAD' });
  if (status === 'read') and.push({ status: 'READ' });
  if (status === 'resolved') and.push({ title: { startsWith: '[RESOLVED]', mode: 'insensitive' } });
  if (status === 'archived') and.push({ title: { startsWith: '[ARCHIVED]', mode: 'insensitive' } });

  if (priority === '1') and.push({ title: { contains: '[PRIORITY]', mode: 'insensitive' } });

  if (q) {
    const query = q.trim();
    and.push({ OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } },
    ]});
  }

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
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(params.get('pageSize') || '50', 10)));
    const where = buildWhere(params);

    const [total, items] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    ]);

    return NextResponse.json({ ok: true, total, items, page, pageSize });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.alerts.list error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
