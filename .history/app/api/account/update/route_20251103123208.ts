import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { prisma, getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type UpdateBody = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  companyName?: string | null;
};

export async function POST(req: Request) {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  if (!prisma) return NextResponse.json({ ok: false, message: 'db_unavailable' }, { status: 503 });
  try {
    const body = (await req.json()) as UpdateBody;
    const email = body.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'invalid_email' }, { status: 400 });
    }
    const db = getPrisma();
    const updated = await db.user.update({
      where: { id: session.sub },
      data: {
        name: (body.name ?? undefined) as any,
        email: (email ?? undefined) as any,
        phone: (body.phone ?? undefined) as any,
        countryCode: (body.countryCode ?? undefined) as any,
      },
      select: { id: true, email: true, name: true, phone: true, countryCode: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    // Prisma unique violation on email
    if (e?.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'email_in_use' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'update_failed' }, { status: 500 });
  }
}
