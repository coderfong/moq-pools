import { NextResponse } from 'next/server';
import { getSession } from '../../../_lib/session';
import { getPrisma } from '@/lib/prisma';
import { emitShipmentAlertsOnUpdate } from '@/lib/shippingAlerts';
import { emitEvent } from '@/lib/alerts';

export const runtime = 'nodejs';

function parseEvents(json?: string | null): any[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

function pushEvent(events: any[], patch: Partial<{ time: string; status: string; message: string; location: string }>) {
  const now = new Date().toISOString();
  events.push({ time: now, status: patch.status || '', message: patch.message || '', location: patch.location || '' });
}

export async function GET(req: Request) {
  // Dev helper: fetch shipments for a given order (poolItemId)
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const prisma: any = getPrisma();
  const url = new URL(req.url);
  const poolItemId = url.searchParams.get('poolItemId') || '';
  if (!poolItemId) return NextResponse.json({ ok: false, error: 'missing_poolItemId' }, { status: 400 });
  // verify ownership
  const owns = await prisma.poolItem.findUnique({ where: { id: poolItemId }, select: { id: true, userId: true } });
  if (!owns || owns.userId !== session.sub) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  const rows = await prisma.shipment.findMany({ where: { poolItemId }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ ok: true, shipments: rows });
}

export async function POST(req: Request) {
  // Dev helper: mutate a shipment to simulate milestones
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const prisma: any = getPrisma();

  const body = await req.json().catch(() => ({}));
  const { poolItemId, shipmentId, action, trackingNo, location } = body || {};
  if (!action || !['pickup','out_for_delivery','delivered'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  }

  // Verify ownership and get/create shipment
  let pi = null as any;
  if (poolItemId) {
    pi = await prisma.poolItem.findUnique({ where: { id: poolItemId }, select: { id: true, userId: true } });
  } else if (shipmentId) {
    const s = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true, poolItemId: true, poolItem: { select: { userId: true } } } });
    if (s) pi = { id: s.poolItemId, userId: s.poolItem.userId };
  }
  if (!pi || pi.userId !== session.sub) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  let sh = await prisma.shipment.findFirst({ where: { poolItemId: pi.id } });
  if (!sh) {
    sh = await prisma.shipment.create({ data: { poolItemId: pi.id, carrier: 'YunExpress', trackingNo: trackingNo || undefined, status: 'LABEL_CREATED', eventsJson: JSON.stringify([]) } });
  }

  // Prev snapshot
  const prev = { id: sh.id, poolItemId: sh.poolItemId, status: sh.status, eventsJson: sh.eventsJson, trackingNo: sh.trackingNo };

  // Build update
  let status = sh.status as string;
  const events = parseEvents(sh.eventsJson);
  const loc = typeof location === 'string' && location ? location : 'Simulator';
  if (action === 'pickup') {
    status = 'IN_TRANSIT';
    pushEvent(events, { status: 'in_transit', message: 'Picked up by courier', location: loc });
  } else if (action === 'out_for_delivery') {
    // keep status as-is or set to in_transit; events will trigger OOD alert
    if (status !== 'IN_TRANSIT') status = 'IN_TRANSIT';
    pushEvent(events, { status: 'out_for_delivery', message: 'Out for delivery', location: loc });
  } else if (action === 'delivered') {
    status = 'DELIVERED';
    pushEvent(events, { status: 'delivered', message: 'Delivered', location: loc });
  }

  const nextRow = await prisma.shipment.update({
    where: { id: sh.id },
    data: { status, trackingNo: trackingNo || sh.trackingNo, eventsJson: JSON.stringify(events), updatedAt: new Date() },
  });

  const next = { id: nextRow.id, poolItemId: nextRow.poolItemId, status: nextRow.status, eventsJson: nextRow.eventsJson, trackingNo: nextRow.trackingNo };
  await emitShipmentAlertsOnUpdate(prev, next);
  if (action === 'delivered') {
    await emitEvent({ type: 'DELIVERED', data: { poolItemId: pi.id } });
  }

  return NextResponse.json({ ok: true, shipment: nextRow });
}
