import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { sendSupportEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  try {
    const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: boolean };
    if (!confirm) return NextResponse.json({ ok: false, message: 'confirmation_required' }, { status: 400 });
    const ok = await sendSupportEmail({
      id: `del-${session.sub}-${Date.now()}`,
      name: 'Account Owner',
      email: session.email || 'unknown@user',
      subject: 'Account deletion request',
      message: `User ${session.sub} requested account deletion. Please verify identity and process according to PDPA/GDPR.`,
      createdAt: new Date().toISOString(),
    } as any);
    return NextResponse.json({ ok: true, notified: ok });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed' }, { status: 500 });
  }
}
