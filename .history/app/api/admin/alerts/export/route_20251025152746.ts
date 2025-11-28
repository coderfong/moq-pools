import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

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
  if (status === 'resolved') and.push({ title: { startsWith: '[RESOLVED]', mode: 'insensitive' } });
  if (status === 'archived') and.push({ title: { startsWith: '[ARCHIVED]', mode: 'insensitive' } });
  if (priority === '1') and.push({ title: { contains: '[PRIORITY]', mode: 'insensitive' } });
  if (q) and.push({ OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { body: { contains: q, mode: 'insensitive' } },
  ]});
  if (from) and.push({ timestamp: { gte: new Date(from) } });
  if (to) and.push({ timestamp: { lte: new Date(to) } });
  if (and.length) where.AND = and;
  return where;
}

function csvEscape(value: any) {
  const s = String(value ?? '').replace(/\r?\n/g, ' ').replaceAll('"', '""');
  return '"' + s + '"';
}

export async function GET(req: Request) {
  try {
    const session = getSession();
    if (!session) return new NextResponse('unauthorized', { status: 401 });
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || String(me.role) !== 'ADMIN') return new NextResponse('forbidden', { status: 403 });

    const url = new URL(req.url);
    const params = url.searchParams;
    const where = buildWhere(params);
    const limit = Math.min(10000, Math.max(1, parseInt(params.get('limit') || '2000', 10)));
    const items = await prisma.alert.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const rows = [
      ['id', 'timestamp', 'status', 'priority', 'resolved', 'archived', 'user_email', 'user_name', 'title', 'body', 'link']
    ];
    for (const a of items) {
      const title = String(a.title || '');
      const priority = /\[PRIORITY\]/i.test(title);
      const resolved = /^\[RESOLVED\]/i.test(title);
      const archived = /^\[ARCHIVED\]/i.test(title);
      rows.push([
        a.id,
        new Date(a.timestamp).toISOString(),
        a.status,
        priority ? '1' : '',
        resolved ? '1' : '',
        archived ? '1' : '',
        a.user?.email || '',
        a.user?.name || '',
        title,
        a.body || '',
        a.link || '',
      ]);
    }

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="alerts_export_${Date.now()}.csv"`
      }
    });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.alerts.export error', e);
    return new NextResponse('server_error', { status: 500 });
  }
}
