import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

function buildWhere(params: URLSearchParams) {
  const status = params.get('status'); // legacy: all|unread|read|resolved|archived
  const readStatus = params.get('read'); // new: all|unread|read
  const triage = params.get('triage'); // new: all|open|resolved|archived
  const priority = params.get('priority'); // '1' to filter
  const q = params.get('q') || '';
  const from = params.get('from');
  const to = params.get('to');

  const where: any = { type: 'SHIPPING' };
  const and: any[] = [];

  // Read filter (prefer 'read' param; fallback to legacy 'status')
  const readVal = readStatus || ((status === 'unread' || status === 'read') ? status : null);
  if (readVal === 'unread') and.push({ status: 'UNREAD' });
  if (readVal === 'read') and.push({ status: 'READ' });
  // Triage filter (prefer 'triage' param; fallback to legacy 'status')
  const triageVal = triage || ((status === 'resolved' || status === 'archived') ? status : null);
  if (triageVal === 'resolved') and.push({ OR: [ { triageStatus: { equals: 'RESOLVED' } }, { title: { startsWith: '[RESOLVED]', mode: 'insensitive' } } ] });
  if (triageVal === 'archived') and.push({ OR: [ { triageStatus: { equals: 'ARCHIVED' } }, { title: { startsWith: '[ARCHIVED]', mode: 'insensitive' } } ] });
  if (triageVal === 'open') and.push({ OR: [ { triageStatus: { equals: 'OPEN' } }, { NOT: [ { title: { startsWith: '[RESOLVED]', mode: 'insensitive' } }, { title: { startsWith: '[ARCHIVED]', mode: 'insensitive' } } ] } ] });

  if (priority === '1') and.push({ OR: [ { priority: { equals: true } }, { title: { contains: '[PRIORITY]', mode: 'insensitive' } } ] });

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
        include: { user: { select: { id: true, email: true, name: true } }, assignee: { select: { id: true, email: true, name: true } } },
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
