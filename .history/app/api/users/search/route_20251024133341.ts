import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function GET(req: NextRequest) {
  if (!prisma) return NextResponse.json({ users: [] }, { status: 503 });
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db: any = prisma as any;
  const me = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
  if (!me || (me.role !== 'ADMIN' && me.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }
  const users = await db.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, name: true, role: true },
    take: 10,
    orderBy: { email: 'asc' },
  });
  return NextResponse.json({ users });
}
