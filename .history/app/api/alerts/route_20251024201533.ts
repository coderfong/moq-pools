import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export const runtime = 'nodejs';

// Sample feed data; replace with DB-backed implementation when available
export async function GET() {
  // Require a valid session and a real user in DB; no sample fallback
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const prisma = getPrisma();
  const me = await (prisma as any).user.findUnique({ where: { id: session.sub }, select: { id: true } });
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const rows = await (prisma as any).alert.findMany({
    where: { userId: me.id },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
  const items = (rows as any[]).map((r) => ({
    id: r.id,
    type: String(r.type || '').toLowerCase(),
    title: r.title,
    body: r.body,
    link: r.link || undefined,
    status: String(r.status || '').toLowerCase(),
    timestamp: new Date(r.timestamp).toISOString(),
  }));
  return NextResponse.json({ ok: true, items });
}
