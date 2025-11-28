import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export async function GET() {
  const session = getSession();
  if (!session || !prisma) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  const db: any = prisma as any;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  return NextResponse.json({ ok: true, user });
}
