import { getPrisma } from '@/lib/prisma';
import { getDefaultConversationIdForUser, sendPushToUsers } from '@/lib/push';

export type DomainEvent =
  | { type: 'USER_JOINED_GROUP'; data: { userId: string; poolId: string; productId?: string } }
  | { type: 'GROUP_PROGRESS_50'; data: { poolId: string } }
  | { type: 'GROUP_PROGRESS_90'; data: { poolId: string } }
  | { type: 'MOQ_MET'; data: { poolId: string } }
  | { type: 'PO_CONFIRMED'; data: { poolItemId: string } }
  | { type: 'SHIPPED'; data: { poolItemId: string; trackingNo?: string } }
  | { type: 'DELIVERED'; data: { poolItemId: string } }
  | { type: 'GROUP_EXPIRING_SOON'; data: { poolId: string; shortCount: number; hoursLeft: number } }
  | { type: 'GROUP_EXPIRED'; data: { poolId: string } }
  | { type: 'PROMO_TRENDING'; data: { productId: string; title?: string } };

export async function createAlert(params: { userId: string; type: 'GROUP_UPDATE' | 'SHIPPING' | 'PROMOTION' | 'SYSTEM'; title: string; body: string; link?: string; timestamp?: Date }) {
  const prisma = getPrisma();
  const { userId, type, title, body, link, timestamp } = params;
  const row = await (prisma as any).alert.create({
    data: {
      userId,
      type,
      title,
      body,
      link: link ?? null,
      status: 'UNREAD',
      timestamp: timestamp ?? new Date(),
    },
    select: { id: true },
  });
  return row.id as string;
}

async function getPoolWithParticipants(poolId: string) {
  const prisma = getPrisma();
  const pool = await (prisma as any).pool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      productId: true,
      targetQty: true,
      pledgedQty: true,
      deadlineAt: true,
      items: { select: { userId: true } },
    },
  });
  return pool as { id: string; productId: string; targetQty: number; pledgedQty: number; deadlineAt: Date; items: { userId: string }[] } | null;
}

async function getPoolItemWithOwner(poolItemId: string) {
  const prisma = getPrisma();
  const pi = await (prisma as any).poolItem.findUnique({
    where: { id: poolItemId },
    select: {
      id: true,
      poolId: true,
      userId: true,
      pool: { select: { productId: true } },
      shipment: { select: { id: true, trackingNo: true } },
    },
  });
  return pi as { id: string; poolId: string; userId: string; pool: { productId: string }; shipment?: { id: string; trackingNo?: string | null } | null } | null;
}

export async function emitEvent(ev: DomainEvent) {
  switch (ev.type) {
    case 'USER_JOINED_GROUP': {
      const link = ev.data.productId ? `/p/${ev.data.productId}` : undefined;
      await createAlert({
        userId: ev.data.userId,
        type: 'GROUP_UPDATE',
        title: 'You joined the group',
        body: "You'll be charged only when MOQ is met.",
        link,
      });
      break;
    }
    case 'GROUP_PROGRESS_50':
    case 'GROUP_PROGRESS_90':
    case 'MOQ_MET':
    case 'GROUP_EXPIRING_SOON':
    case 'GROUP_EXPIRED': {
      const pool = await getPoolWithParticipants(ev.data.poolId);
      if (!pool) return;
      const link = pool.productId ? `/p/${pool.productId}` : undefined;
      const userIds = Array.from(new Set(pool.items.map(i => i.userId)));
      let title = '';
      let body = '';
      let type: 'GROUP_UPDATE' | 'SYSTEM' = 'GROUP_UPDATE';
      if (ev.type === 'GROUP_PROGRESS_50') {
        title = '50% filled — invite friends';
        body = `${pool.pledgedQty}/${pool.targetQty} joined — invite friends.`;
      } else if (ev.type === 'GROUP_PROGRESS_90') {
        const remaining = Math.max(0, pool.targetQty - pool.pledgedQty);
        title = 'Almost there!';
        body = `Only ${remaining} more needed to hit MOQ.`;
      } else if (ev.type === 'MOQ_MET') {
        title = 'MOQ reached. Charging now.';
        body = 'We are processing payment and preparing your order.';
      } else if (ev.type === 'GROUP_EXPIRING_SOON') {
        const { shortCount, hoursLeft } = ev.data as any;
        title = 'Group expiring soon';
        body = `${shortCount} short. Closes in ${hoursLeft}h.`;
      } else if (ev.type === 'GROUP_EXPIRED') {
        type = 'SYSTEM';
        title = 'MOQ not reached. No charge.';
        body = 'Explore similar groups and try again soon.';
      }
      await Promise.all(userIds.map(uid => createAlert({ userId: uid, type, title, body, link })));
      // Push: send on MOQ reached as a critical event
      if (ev.type === 'MOQ_MET') {
        try { await sendPushToUsers(userIds, title, body, '/messages'); } catch {}
      }
      break;
    }
    case 'PO_CONFIRMED': {
      const pi = await getPoolItemWithOwner(ev.data.poolItemId);
      if (!pi) return;
      const link = pi.pool?.productId ? `/p/${pi.pool.productId}` : '/orders';
      await createAlert({ userId: pi.userId, type: 'SHIPPING', title: 'Preparing shipment', body: 'Supplier confirmed PO. Preparing shipment.', link });
      break;
    }
    case 'SHIPPED': {
      const pi = await getPoolItemWithOwner(ev.data.poolItemId);
      if (!pi) return;
      const tracking = ev.data.trackingNo || pi.shipment?.trackingNo || '';
      const link = '/orders';
      const title = 'Order shipped';
      const body = tracking ? `Tracking ${tracking}` : 'Your order has shipped.';
      await createAlert({ userId: pi.userId, type: 'SHIPPING', title, body, link });
      try {
        const c = await getDefaultConversationIdForUser(pi.userId);
        const url = c ? `/messages?c=${c}` : '/messages';
        await sendPushToUsers([pi.userId], title, body, url);
      } catch {}
      break;
    }
    case 'DELIVERED': {
      const pi = await getPoolItemWithOwner(ev.data.poolItemId);
      if (!pi) return;
      const link = '/orders';
      const title = 'Delivered — thanks!';
      const body = 'Hope you love it. Rate your order.';
      await createAlert({ userId: pi.userId, type: 'SHIPPING', title, body, link });
      try {
        const c = await getDefaultConversationIdForUser(pi.userId);
        const url = c ? `/messages?c=${c}` : '/messages';
        await sendPushToUsers([pi.userId], title, body, url);
      } catch {}
      break;
    }
    case 'PROMO_TRENDING': {
      const title = ev.data.title || 'Trending group-buy';
      const link = `/p/${ev.data.productId}`;
      // For now this event is targeted; call this with the intended audience userIds externally if you need broadcast.
      // No-op without audience; you can extend this to select followers/segment.
      break;
    }
  }
}

// Helper: determine if pledgedQty crossed key thresholds and emit events.
export async function maybeEmitGroupProgressEvents(args: {
  poolId: string;
  prevPledged: number;
  newPledged: number;
  targetQty: number;
}) {
  const { poolId, prevPledged, newPledged, targetQty } = args;
  if (targetQty <= 0) return;
  const crossed = (threshold: number) => prevPledged < threshold && newPledged >= threshold;
  const fifty = Math.ceil(targetQty * 0.5);
  const ninety = Math.ceil(targetQty * 0.9);

  const events: DomainEvent[] = [];
  if (crossed(fifty)) events.push({ type: 'GROUP_PROGRESS_50', data: { poolId } });
  if (crossed(ninety)) events.push({ type: 'GROUP_PROGRESS_90', data: { poolId } });
  if (crossed(targetQty)) events.push({ type: 'MOQ_MET', data: { poolId } });

  for (const ev of events) await emitEvent(ev);
}

// Store-backed, idempotent milestone emitter based on current Pool state.
// Reads Pool.progress and lastProgressMilestone, and atomically advances milestone
// to emit each newly crossed event at most once.
export async function maybeEmitGroupProgressEventsWithStore(poolId: string) {
  const prisma = getPrisma();
  const pool = await (prisma as any).pool.findUnique({
    where: { id: poolId },
    select: { id: true, pledgedQty: true, targetQty: true, lastProgressMilestone: true },
  });
  if (!pool) return;
  const { pledgedQty, targetQty } = pool as any;
  if (!targetQty || targetQty <= 0) return;

  const fifty = Math.ceil(targetQty * 0.5);
  const ninety = Math.ceil(targetQty * 0.9);
  const hit50 = pledgedQty >= fifty;
  const hit90 = pledgedQty >= ninety;
  const hitMOQ = pledgedQty >= targetQty;

  // Stepwise advance to avoid races; each update uses a guarded WHERE
  const toEmit: DomainEvent[] = [];

  // Advance NONE -> FIFTY
  if (hit50) {
    const res = await (prisma as any).pool.updateMany({
      where: { id: poolId, lastProgressMilestone: 'NONE' },
      data: { lastProgressMilestone: 'FIFTY' },
    });
    if (res.count > 0) toEmit.push({ type: 'GROUP_PROGRESS_50', data: { poolId } });
  }

  // Advance FIFTY -> NINETY
  if (hit90) {
    const res = await (prisma as any).pool.updateMany({
      where: { id: poolId, lastProgressMilestone: 'FIFTY' },
      data: { lastProgressMilestone: 'NINETY' },
    });
    if (res.count > 0) toEmit.push({ type: 'GROUP_PROGRESS_90', data: { poolId } });
  }

  // Advance NINETY -> MOQ
  if (hitMOQ) {
    const res = await (prisma as any).pool.updateMany({
      where: { id: poolId, lastProgressMilestone: 'NINETY' },
      data: { lastProgressMilestone: 'MOQ' },
    });
    if (res.count > 0) toEmit.push({ type: 'MOQ_MET', data: { poolId } });
  }

  for (const ev of toEmit) await emitEvent(ev);
}
