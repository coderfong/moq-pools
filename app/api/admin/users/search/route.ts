import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';

export async function GET(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
    if (!me || String(me.role) !== 'ADMIN') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const take = Math.min(50, Math.max(1, parseInt(url.searchParams.get('take') || '20', 10)));
    if (!q) return NextResponse.json({ ok: true, users: [] });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, email: true, name: true },
      take,
      orderBy: { email: 'asc' },
    });
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('admin.users.search error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
