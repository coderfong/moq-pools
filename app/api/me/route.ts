import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../_lib/session';
import { auth } from '@/auth';

export async function GET() {
  // Try custom session first (for traditional login)
  let session = getSession();
  let userId: string | null = null;
  
  if (session) {
    userId = session.sub;
    console.log("/api/me - custom session:", { sub: session.sub, email: session.email });
  } else {
    // Fall back to NextAuth session (for OAuth login)
    const nextAuthSession = await auth();
    if (nextAuthSession?.user?.id) {
      userId = nextAuthSession.user.id;
      console.log("/api/me - NextAuth session:", { id: nextAuthSession.user.id, email: nextAuthSession.user.email });
    }
  }
  
  if (!userId || !prisma) {
    console.log("/api/me - No session or prisma, returning ok: false");
    return NextResponse.json({ ok: false, user: null }, { status: 200 });
  }
  
  const db: any = prisma as any;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      role: true,
      countryCode: true,
    },
  });
  
  console.log("/api/me - User found:", user ? { id: user.id, email: user.email } : null);
  
  if (!user) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  return NextResponse.json({ ok: true, user });
}
