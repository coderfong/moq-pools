import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';

export async function GET() {
  const session = getSession();
  console.log("/api/me - session:", session ? { sub: session.sub, email: session.email } : null);
  
  if (!session || !prisma) {
    console.log("/api/me - No session or prisma, returning ok: false");
    return NextResponse.json({ ok: false, user: null }, { status: 200 });
  }
  
  const db: any = prisma as any;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true },
  });
  
  console.log("/api/me - User found:", user ? { id: user.id, email: user.email } : null);
  
  if (!user) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  return NextResponse.json({ ok: true, user });
}
