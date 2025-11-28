import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { normalizeStatus } from '@/lib/statusModel';
import { computeDynamicEta } from '@/lib/shippingEta';
import { emitShipmentAlertsOnUpdate } from '@/lib/shippingAlerts';
import { emitEvent, createAlert } from '@/lib/alerts';
import { getDefaultConversationIdForUser, sendPushToUsers } from '@/lib/push';
import { publishToUser } from '@/lib/sse';

export const runtime = 'nodejs';

function ok(data: any, init: number = 200) {
  return new NextResponse(JSON.stringify(data), { status: init, headers: { 'content-type': 'application/json' } });
}

function bad(message: string, code = 400) {
  return ok({ ok: false, error: message }, code);
}

function authOk(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.get('token');
  const h1 = req.headers.get('x-webhook-secret');
  const h2 = req.headers.get('authorization');
  const token = (qs || h1 || (h2 && h2.replace(/Bearer\s+/i, '')) || '').trim();
  const expected = (process.env.CARRIER_WEBHOOK_SECRET || '').trim();
  return expected && token && token === expected;
}

function toShipStatus(k: string): 'LABEL_CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' {
  const s = normalizeStatus(k);
  if (s === 'delivered') return 'DELIVERED';
  if (s === 'exception' || s === 'canceled') return 'EXCEPTION';
  if (s === 'pending' || s === 'preparing_shipment' || s === 'moq_reached') return 'LABEL_CREATED';
  // in_transit, out_for_delivery -> IN_TRANSIT
  return 'IN_TRANSIT';
}

function appendEvent(eventsJson: string | null | undefined, ev: { ts?: string; loc?: string; desc?: string; status?: string }) {
  let arr: any[] = [];
  try { const v = eventsJson ? JSON.parse(eventsJson) : []; arr = Array.isArray(v) ? v : []; } catch {}
  const row = {
    time: ev.ts || new Date().toISOString(),
    location: ev.loc || '',
    message: ev.desc || '',
    status: (ev.status || '').toLowerCase(),
  };
  arr.push(row);
  return JSON.stringify(arr);
}

export async function POST(req: Request) {
  try {
    if (!authOk(req)) return bad('unauthorized', 401);

    const payload = await req.json().catch(() => ({}));
    const carrier = String(payload?.carrier || '').trim();
    const trackingNumber = String(payload?.trackingNumber || '').trim();
    const statusRaw = String(payload?.status || '').trim();
    const event = payload?.event || {};

    if (!trackingNumber) return bad('missing_trackingNumber', 400);

    const prisma: any = getPrisma();
    let sh = await prisma.shipment.findFirst({
      where: { trackingNo: trackingNumber },
      include: {
        poolItem: { select: { id: true, userId: true, address: { select: { country: true } } } },
      },
    });

    if (!sh) {
      // Optional: create a placeholder shipment if not found (disabled by default)
      return bad('shipment_not_found', 404);
    }

    const prev = { id: sh.id, poolItemId: sh.poolItemId, status: sh.status, eventsJson: sh.eventsJson, trackingNo: sh.trackingNo };

    const newStatus = toShipStatus(statusRaw || event?.status || '');
    const newEventsJson = appendEvent(sh.eventsJson, { ts: event?.ts, loc: event?.loc, desc: event?.desc, status: statusRaw });

    // Compute ETA using existing heuristics
    const nextTmp = { ...sh, status: newStatus, eventsJson: newEventsJson };
    const dyn = computeDynamicEta(nextTmp);
    const etaDate = dyn?.etaDate ? new Date(dyn.etaDate) : null;

    sh = await prisma.shipment.update({
      where: { id: sh.id },
      data: { status: newStatus, eventsJson: newEventsJson, etaDate, carrier: carrier || sh.carrier || undefined, updatedAt: new Date() },
      include: { poolItem: { select: { id: true, userId: true, address: { select: { country: true } } } } },
    });

    const next = { id: sh.id, poolItemId: sh.poolItemId, status: sh.status, eventsJson: sh.eventsJson, trackingNo: sh.trackingNo };

    // Emit Alerts (pickup / OOD) and Delivered as needed
    await emitShipmentAlertsOnUpdate(prev, next);
    if (newStatus === 'DELIVERED') {
      await emitEvent({ type: 'DELIVERED', data: { poolItemId: sh.poolItemId } });
    }

    // Create a message in the user's default conversation and push + SSE
    try {
      const userId = sh.poolItem?.userId as string;
      if (userId) {
        const convId = await getDefaultConversationIdForUser(userId);
        const msgText = [carrier ? carrier : 'Carrier', event?.desc || statusRaw || 'Update', event?.loc ? `(${event.loc})` : '']
          .filter(Boolean).join(' — ');

        if (convId) {
          await prisma.message.create({ data: { conversationId: convId, sender: 'them', text: msgText } });
          await prisma.conversation.update({ where: { id: convId }, data: { preview: msgText, updatedAt: new Date() } });
        }

        const link = `/orders/${sh.poolItemId}/track`;
        const title = carrier ? `${carrier} update` : 'Tracking update';
        await createAlert({ userId, type: 'SHIPPING', title, body: msgText, link });
        try { await sendPushToUsers([userId], title, msgText, link); } catch {}

        // SSE real-time event for clients listening on /api/events
        try {
          publishToUser(userId, { type: 'shipment_update', data: {
            orderId: sh.poolItemId,
            trackingNumber,
            status: newStatus,
            event: { ts: event?.ts || new Date().toISOString(), loc: event?.loc || '', desc: event?.desc || '', carrier },
            link,
          }});
        } catch {}
      }
    } catch {}

    return ok({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('carrier webhook error', msg);
    if (process.env.NODE_ENV !== 'production') return bad(msg, 500);
    return bad('server_error', 500);
  }
}
