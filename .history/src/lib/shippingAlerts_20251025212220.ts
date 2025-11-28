import { getPrisma } from '@/lib/prisma';
import { createAlert } from '@/lib/alerts';
import { getDefaultConversationIdForUser, sendPushToUsers } from '@/lib/push';

export type ShipmentSnapshot = {
  id: string;
  poolItemId: string;
  status?: string | null; // LABEL_CREATED | IN_TRANSIT | DELIVERED | EXCEPTION | custom strings
  eventsJson?: string | null; // array of { time, status, message, location }
  trackingNo?: string | null;
};

function parseEvents(json?: string | null): Array<{ time?: string; status?: string; message?: string; location?: string }> {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

function hasOutForDelivery(events: Array<{ status?: string; message?: string }>): boolean {
  return events.some((e) => {
    const s = String(e?.status || '').toLowerCase();
    const m = String(e?.message || '').toLowerCase();
    return s === 'out_for_delivery' || s === 'out-for-delivery' || /out for delivery/.test(m);
  });
}

export async function emitShipmentAlertsOnUpdate(prev: ShipmentSnapshot | null, next: ShipmentSnapshot) {
  const prisma = getPrisma();
  // Load owner
  const s = await (prisma as any).shipment.findUnique({
    where: { id: next.id },
    select: { poolItem: { select: { id: true, userId: true } } },
  });
  const poolItemId = s?.poolItem?.id || next.poolItemId;
  const userId = s?.poolItem?.userId as string | undefined;
  if (!userId) return;

  const link = `/orders/${poolItemId}/track`;
  const tracking = next.trackingNo || '';

  // 1) First pickup scan (IN_TRANSIT for the first time)
  const prevInTransit = String(prev?.status || '').toUpperCase() === 'IN_TRANSIT';
  const nextInTransit = String(next?.status || '').toUpperCase() === 'IN_TRANSIT';
  if (!prevInTransit && nextInTransit) {
    const title = 'Picked up by courier.';
    const body = tracking ? `Tracking ${tracking}` : 'On the way.';
    await createAlert({ userId, type: 'SHIPPING', title, body, link });
    try {
      const c = await getDefaultConversationIdForUser(userId);
      const url = c ? `/messages?c=${c}` : '/messages';
      await sendPushToUsers([userId], title, body, url);
    } catch {}
  }

  // 2) Out for delivery (detected from events delta)
  const prevOut = hasOutForDelivery(parseEvents(prev?.eventsJson));
  const nextOut = hasOutForDelivery(parseEvents(next?.eventsJson));
  if (!prevOut && nextOut) {
    const title = 'Arriving today.';
    const body = tracking ? `Tracking ${tracking}` : undefined as any;
    await createAlert({ userId, type: 'SHIPPING', title, body: body || 'Out for delivery', link });
    try {
      const c = await getDefaultConversationIdForUser(userId);
      const url = c ? `/messages?c=${c}` : '/messages';
      await sendPushToUsers([userId], title, body || 'Out for delivery', url);
    } catch {}
  }

  // 3) Delivered handled elsewhere via DomainEvent('DELIVERED')
}
