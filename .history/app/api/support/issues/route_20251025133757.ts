import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { orderId, shipmentId, tracking, message } = body || {};

    // For now, just log the issue to server logs; can be wired to DB or email later.
    console.log('[support.issue]', {
      userId: session.sub,
      email: session.email,
      orderId: orderId || null,
      shipmentId: shipmentId || null,
      tracking: tracking || null,
      message: typeof message === 'string' ? message : null,
      ts: new Date().toISOString(),
      ua: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('support.issue error', err);
    }
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
