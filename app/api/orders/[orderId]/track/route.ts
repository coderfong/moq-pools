import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';
import { overallFromShipments, normalizeStatus } from '@/lib/statusModel';

export const runtime = 'nodejs';

function parseOrderId(raw: string): string {
  // support ord_<id> or raw cuid
  const m = /^ord[_-]/i.test(raw) ? raw.replace(/^ord[_-]/i, '') : raw;
  return m;
}

function jsonArray<T = any>(s?: string | null): T[] {
  if (!s) return [] as T[];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    let prisma: any;
    try { prisma = getPrisma(); } catch (e: any) {
      if (String(e?.message || '').startsWith('db_unavailable')) {
        return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 });
      }
      throw e;
    }

    const orderIdRaw = params.orderId;
    const poolItemId = parseOrderId(orderIdRaw);

    // Ensure the order belongs to the current user
    const pi = await prisma.poolItem.findUnique({
      where: { id: poolItemId },
      select: {
        id: true,
        userId: true,
        quantity: true,
        createdAt: true,
        address: { select: { name: true, phone: true, line1: true, line2: true, city: true, country: true, postal: true, state: true } },
        payment: { select: { status: true, paidAt: true } },
        pool: { select: { product: { select: { id: true, title: true, imagesJson: true } } } },
      }
    });
    if (!pi || pi.userId !== session.sub) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    // Load shipments for this order
    const shipments = await prisma.shipment.findMany({
      where: { poolItemId: pi.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, carrier: true, trackingNo: true, status: true, etaDate: true, eventsJson: true,
      }
    });

    const orderStatus = overallFromShipments(shipments.map((s: any) => String(s.status || '')));

    // Conservative overall ETA: latest among undelivered shipments
    const etaDates: Date[] = shipments
      .filter((s: any) => normalizeStatus(String(s.status || '')) !== 'delivered')
      .map((s: any) => (s.etaDate ? new Date(s.etaDate) : null))
      .filter(Boolean) as Date[];
    const overallEta = etaDates.length ? new Date(Math.max(...etaDates.map((d) => d.getTime()))) : null;

    const itemTitle = pi.pool?.product?.title || 'Item';
    let itemImage: string | undefined;
    try {
      const arr = JSON.parse(String(pi.pool?.product?.imagesJson || '[]'));
      if (Array.isArray(arr) && arr[0]) itemImage = String(arr[0]);
    } catch {}

    const response = {
      order: {
        id: `ord_${pi.id}`,
        status: orderStatus,
        placedAt: new Date(pi.createdAt).toISOString(),
        eta: overallEta ? overallEta.toISOString().slice(0, 10) : null,
        items: [
          { sku: String(pi.pool?.product?.id || ''), title: itemTitle, image: itemImage, qty: pi.quantity }
        ],
        address: {
          name: pi.address?.name || '',
          phone: pi.address?.phone || '',
          line1: [pi.address?.line1, pi.address?.line2].filter(Boolean).join(', '),
          city: [pi.address?.city, pi.address?.state].filter(Boolean).join(', '),
          country: pi.address?.country || '',
          postal: pi.address?.postal || ''
        },
        payment: pi.payment ? { status: String(pi.payment.status || '').toLowerCase(), capturedAt: pi.payment.paidAt ? new Date(pi.payment.paidAt).toISOString() : null } : { status: 'pending', capturedAt: null },
      },
      shipments: shipments.map((s: any) => {
        const evs = jsonArray<any>(s.eventsJson);
        return {
          id: s.id,
          carrier: s.carrier || null,
          trackingNumber: s.trackingNo || null,
          status: normalizeStatus(String(s.status || '')),
          eta: s.etaDate ? new Date(s.etaDate).toISOString().slice(0, 10) : null,
          items: [{ sku: String(pi.pool?.product?.id || ''), qty: pi.quantity }],
          events: evs.map((e: any) => ({
            ts: e.time ? new Date(e.time).toISOString() : undefined,
            status: String(e.status || '').toLowerCase() || undefined,
            loc: e.location || e.loc || undefined,
            desc: e.message || e.desc || undefined,
          })),
          links: {
            carrierTrack: s.trackingNo ? `https://track.aftership.com/${encodeURIComponent(s.trackingNo)}` : undefined,
          },
        };
      }),
    };

    return NextResponse.json(response);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const body: any = { ok: false, error: 'server_error' };
    if (process.env.NODE_ENV !== 'production') body.details = msg;
    return NextResponse.json(body, { status: 500 });
  }
}
