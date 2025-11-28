import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { orderId, shipmentId, tracking, message, category, priority } = body || {} as any;

    // For now, just log the issue to server logs; can be wired to DB or email later.
    console.log('[support.issue]', {
      userId: session.sub,
      email: session.email,
      orderId: orderId || null,
      shipmentId: shipmentId || null,
      tracking: tracking || null,
      message: typeof message === 'string' ? message : null,
      category: category || null,
      priority: !!priority,
      ts: new Date().toISOString(),
      ua: req.headers.get('user-agent') || null,
    });

    try {
      const prisma: any = getPrisma();
      const title = `Delivery issue${priority ? ' [PRIORITY]' : ''}${category ? `: ${String(category)}` : ''}`;
      const bodyText = [
        message ? String(message) : null,
        orderId ? `Order: ${orderId}` : null,
        shipmentId ? `Shipment: ${shipmentId}` : null,
        tracking ? `Tracking: ${tracking}` : null,
      ].filter(Boolean).join('\n');
      await prisma.alert.create({
        data: {
          userId: session.sub,
          type: 'SHIPPING',
          title,
          body: bodyText || 'User reported a delivery issue.',
          link: '/account/orders/tracking',
        },
      });
    } catch (e) {
      // Non-fatal; still respond ok so user sees success
      if (process.env.NODE_ENV !== 'production') console.error('support.issue prisma error', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('support.issue error', err);
    }
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
