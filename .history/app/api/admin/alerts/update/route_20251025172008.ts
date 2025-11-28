import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

type UpdateBody = {
  id?: string
  ids?: string[]
  action?: 'read' | 'resolve' | 'archive' | 'delete'
  title?: string
  body?: string
  link?: string | null
  adminNotes?: string
  assigneeId?: string | null
  priority?: boolean
  triageStatus?: 'OPEN' | 'RESOLVED' | 'ARCHIVED'
};

function addPrefixOnce(title: string, prefix: string) {
  if (!title) return prefix.trim();
  if (title.startsWith(prefix)) return title;
  return `${prefix} ${title}`.trim();
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || String(me.role) !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({})) as UpdateBody;

    // Bulk actions
    if (body.action && Array.isArray(body.ids) && body.ids.length > 0) {
      const ids = body.ids;
      if (body.action === 'delete') {
        const result = await prisma.alert.deleteMany({ where: { id: { in: ids } } });
        return NextResponse.json({ ok: true, deleted: Number(result?.count ?? 0) });
      }
      if (body.action === 'read') {
        const result = await prisma.alert.updateMany({ where: { id: { in: ids } }, data: { status: 'READ' } });
        return NextResponse.json({ ok: true, updated: Number(result?.count ?? 0) });
      }
      if (body.action === 'resolve' || body.action === 'archive') {
        // Try triage fields first; fallback to prefix if not available
        try {
          if (body.action === 'resolve') {
            const result = await prisma.alert.updateMany({ where: { id: { in: ids } }, data: { triageStatus: 'RESOLVED', resolvedAt: new Date(), status: 'READ' } });
            return NextResponse.json({ ok: true, updated: Number(result?.count ?? 0) });
          } else {
            const result = await prisma.alert.updateMany({ where: { id: { in: ids } }, data: { triageStatus: 'ARCHIVED', archivedAt: new Date(), status: 'READ' } });
            return NextResponse.json({ ok: true, updated: Number(result?.count ?? 0) });
          }
        } catch (_e) {
          const prefix = body.action === 'resolve' ? '[RESOLVED]' : '[ARCHIVED]';
          let updated = 0;
          for (const id of ids) {
            const a = await prisma.alert.findUnique({ where: { id }, select: { id: true, title: true } });
            if (!a) continue;
            const title = addPrefixOnce(String(a.title || ''), prefix);
            const res = await prisma.alert.update({ where: { id }, data: { title, status: 'READ' } });
            if (res) updated++;
          }
          return NextResponse.json({ ok: true, updated });
        }
      }
    }

    // Single update
    if (!body.id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
    const data: any = {};
    if (typeof body.title === 'string') data.title = body.title.trim().slice(0, 500);
    if (typeof body.body === 'string') data.body = body.body.trim().slice(0, 5000);
    if (typeof body.link === 'string' || body.link === null) data.link = body.link ? body.link.trim().slice(0, 1000) : null;
    if (typeof body.adminNotes === 'string') data.adminNotes = body.adminNotes.trim().slice(0, 5000);
    if (typeof body.priority === 'boolean') data.priority = body.priority;
    if (typeof body.assigneeId === 'string' || body.assigneeId === null) data.assigneeId = body.assigneeId ?? null;

    // Optional triageStatus update
    if (body.triageStatus === 'RESOLVED') { try { data.triageStatus = 'RESOLVED'; data.resolvedAt = new Date(); } catch {} }
    if (body.triageStatus === 'ARCHIVED') { try { data.triageStatus = 'ARCHIVED'; data.archivedAt = new Date(); } catch {} }
    if (body.triageStatus === 'OPEN') { try { data.triageStatus = 'OPEN'; } catch {} }

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, updated: 0 });
    let updated;
    try {
      updated = await prisma.alert.update({ where: { id: body.id }, data });
    } catch (_e) {
      // Fallback: ignore unknown fields in case migration not applied yet
      const fallbackData: any = {};
      if (data.title) fallbackData.title = data.title;
      if (data.body) fallbackData.body = data.body;
      if ('link' in data) fallbackData.link = data.link;
      updated = await prisma.alert.update({ where: { id: body.id }, data: fallbackData });
    }
    return NextResponse.json({ ok: true, alert: updated });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.alerts.update error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
