"use client";
import React, { useMemo, useState } from "react";

function formatDate(dt?: string | Date | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!dt) return "";
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  try { return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', ...opts }); } catch { return String(d); }
}

function shortId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

type ShipmentDTO = any; // using any to avoid tight coupling with Prisma types

function carrierName(carrier?: string | null) {
  const c = (carrier || '').trim();
  if (!c) return 'Carrier';
  return c.toUpperCase();
}

function statusBadge(status?: string | null) {
  const s = String(status || '').toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    label_created: { label: 'Processing', cls: 'bg-amber-100 text-amber-800' },
    in_transit: { label: 'In Transit', cls: 'bg-blue-100 text-blue-800' },
    exception: { label: 'Issue', cls: 'bg-red-100 text-red-800' },
    delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-800' },
  };
  const meta = map[s] || { label: 'Processing', cls: 'bg-neutral-100 text-neutral-800' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>;
}

function computeOverallStatus(shipments: ShipmentDTO[]) {
  // Order of precedence
  const priority = ['delivered', 'in_transit', 'label_created', 'exception'];
  const have: Record<string, boolean> = {};
  for (const s of shipments) have[String(s.status || '').toLowerCase()] = true;
  for (const k of priority) if (have[k]) return k;
  return 'label_created';
}

function stepProgress(status?: string | null) {
  const s = String(status || '').toLowerCase();
  const steps = ['Processing', 'In Transit', 'Out for Delivery', 'Delivered'];
  const idx = s === 'delivered' ? 3 : s === 'in_transit' ? 1 : s === 'exception' ? 1 : 0;
  return { steps, active: idx };
}

function parseImages(json?: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter(Boolean);
  } catch {}
  return [];
}

export default function OrderTrackingClient({ shipments }: { shipments: ShipmentDTO[] }) {
  const [filter, setFilter] = useState<'all' | number>('all');
  const filteredShipments = useMemo(() => {
    if (filter === 'all') return shipments;
    return shipments.slice(filter, filter + 1);
  }, [filter, shipments]);

  const first = shipments[0];
  const orderId = first?.poolItem?.id ? `ORD-${shortId(first.poolItem.id)}` : 'ORD-—';
  const groupId = first?.poolItem?.pool?.id ? `GRP-${shortId(first.poolItem.pool.id)}` : null;
  const placedAt = first?.poolItem?.createdAt ? formatDate(first.poolItem.createdAt) : null;
  const overall = computeOverallStatus(shipments);
  const etaDate = shipments.find((s) => !!s.etaDate)?.etaDate || null;
  const etaStr = etaDate ? `${formatDate(etaDate)} (±2 days)` : '—';

  const product = first?.poolItem?.pool?.product;
  const images = parseImages(product?.imagesJson);

  return (
    <div className="mt-4">
      {/* Header Summary */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-lg bg-neutral-100 overflow-hidden">
              {images[0] ? <img src={images[0]} alt={product?.title || 'Product'} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{product?.title || 'Order'}</div>
              <div className="mt-1 text-sm text-neutral-600 flex items-center gap-2">
                <span>Order ID:</span>
                <button
                  className="font-mono underline decoration-dotted underline-offset-2"
                  onClick={() => navigator.clipboard.writeText(orderId).catch(() => {})}
                  title="Copy Order ID"
                >{orderId}</button>
                {groupId && (
                  <>
                    <span>•</span>
                    <span>Group:</span>
                    <button
                      className="font-mono underline decoration-dotted underline-offset-2"
                      onClick={() => navigator.clipboard.writeText(groupId).catch(() => {})}
                      title="Copy Group ID"
                    >{groupId}</button>
                  </>
                )}
                {placedAt && <><span>•</span><span>Placed {placedAt}</span></>}
              </div>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            {statusBadge(overall)}
            <div className="text-sm text-neutral-700">Estimated delivery: {etaStr}</div>
            {shipments.length === 1 && shipments[0]?.trackingNo && (
              <a
                href={`https://track.aftership.com/${encodeURIComponent(shipments[0].trackingNo)}`}
                target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >Track with Carrier</a>
            )}
          </div>
        </div>
      </div>

      {/* Sticky filter */}
      {shipments.length > 1 && (
        <div className="sticky top-0 z-10 mt-4 bg-neutral-50/80 backdrop-blur py-2">
          <div className="inline-flex rounded-full border border-neutral-200 bg-white p-1 text-sm shadow-sm">
            <button
              className={`rounded-full px-3 py-1 ${filter === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
              onClick={() => setFilter('all')}
            >All</button>
            {shipments.map((_, i) => (
              <button key={i}
                className={`rounded-full px-3 py-1 ${filter === i ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
                onClick={() => setFilter(i)}
              >Shipment {i + 1}</button>
            ))}
          </div>
        </div>
      )}

      {/* Shipment Cards */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        {filteredShipments.map((s: any, idx: number) => {
          const p = s.poolItem?.pool?.product;
          const imgs = parseImages(p?.imagesJson);
          const created = formatDate(s.updatedAt, { hour: '2-digit', minute: '2-digit' });
          const eta = s.etaDate ? formatDate(s.etaDate) : null;
          const tracking = s.trackingNo || '';
          const st = String(s.status || '').toLowerCase();
          const prog = stepProgress(st);
          const code = `SHP-${shortId(s.id)}`;
          return (
            <div key={s.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="flex flex-col md:flex-row gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-12 rounded bg-neutral-100 overflow-hidden">
                    {imgs[0] ? <img src={imgs[0]} alt={p?.title || 'Item'} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-neutral-500">Shipment {idx + 1} • {code}</div>
                    <div className="truncate font-medium">{p?.title || 'Item'}</div>
                    <div className="mt-1 text-sm text-neutral-700 flex items-center gap-2 flex-wrap">
                      {statusBadge(st)}
                      <span>•</span>
                      <span>Last update {created}</span>
                      {eta && (<><span>•</span><span>ETA {eta}</span></>)}
                    </div>
                    {tracking && (
                      <div className="mt-1 text-sm">
                        Tracking: <span className="font-mono">{tracking}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        {prog.steps.map((name, i) => (
                          <React.Fragment key={i}>
                            <div className={`inline-flex items-center gap-1 ${i <= prog.active ? 'text-neutral-900' : ''}`}>
                              <span className={`inline-block size-2 rounded-full ${i <= prog.active ? 'bg-neutral-900' : 'bg-neutral-300'}`} />
                              <span>{name}</span>
                            </div>
                            {i < prog.steps.length - 1 && <div className="flex-1 h-px bg-neutral-200" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:ml-auto flex items-start gap-2">
                  {tracking && (
                    <>
                      <button
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                        onClick={() => navigator.clipboard.writeText(tracking).catch(() => {})}
                      >Copy tracking</button>
                      <a
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                        href={`https://track.aftership.com/${encodeURIComponent(tracking)}`}
                        target="_blank" rel="noopener noreferrer"
                      >Track with Courier</a>
                    </>
                  )}
                  <button
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                    onClick={() => {
                      const payload = {
                        orderId,
                        shipmentId: s.id,
                        tracking: tracking || undefined,
                      };
                      const text = `Support request for ${orderId}\nShipment: ${code}\nTracking: ${tracking || '—'}`;
                      if (typeof window !== 'undefined') {
                        try { navigator.clipboard.writeText(text); } catch {}
                        alert('Support details copied. Please paste into chat or email.');
                      }
                    }}
                  >Report an issue</button>
                </div>
              </div>
              {/* Events */}
              {s.eventsJson && (
                <div className="border-t border-neutral-200 p-4">
                  <ul className="space-y-1.5 text-sm text-neutral-600">
                    {(() => {
                      let events: any[] = [];
                      try { events = JSON.parse(s.eventsJson) || []; } catch {}
                      return events.reverse().slice(0, 10).map((ev, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 inline-block size-1.5 rounded-full bg-neutral-300" />
                          <div className="min-w-0">
                            <div className="text-xs text-neutral-400">{ev.location || ''} {ev.time ? `• ${ev.time}` : ''}</div>
                            <div>{ev.message || 'Update'}</div>
                          </div>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delivery Address & Method + Payment & Fulfillment */}
      {first?.poolItem && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-medium">Delivery Address & Method</h3>
            <div className="mt-2 text-sm text-neutral-700">
              {first.poolItem.address ? (
                <>
                  <div>{first.poolItem.address.line1}{first.poolItem.address.line2 ? `, ${first.poolItem.address.line2}` : ''}</div>
                  <div>{[first.poolItem.address.city, first.poolItem.address.state, first.poolItem.address.postal].filter(Boolean).join(', ')}</div>
                  <div>{first.poolItem.address.country}</div>
                  {first.poolItem.address.phone && <div className="mt-1 text-neutral-500">{first.poolItem.address.phone}</div>}
                </>
              ) : (
                <div>—</div>
              )}
              <div className="mt-3 text-sm text-neutral-600">Shipping method: <span className="font-medium">Standard</span></div>
              <div className="mt-1 text-sm text-neutral-600">Incoterms: <span className="font-medium">—</span></div>
              <div className="mt-1 text-sm text-neutral-600">Notes: <span className="font-medium">—</span></div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-medium">Payment & Fulfillment</h3>
            <div className="mt-2 text-sm text-neutral-700 space-y-1">
              {first.poolItem.payment ? (
                <>
                  <div>Payment: <span className="font-medium">{String(first.poolItem.payment.status || '').toLowerCase()}</span> {first.poolItem.payment.paidAt ? `• ${formatDate(first.poolItem.payment.paidAt)}` : ''}</div>
                  <div>Method: <span className="font-medium">{String(first.poolItem.payment.method || '').toLowerCase()}</span></div>
                </>
              ) : (
                <div>Payment: <span className="font-medium">—</span></div>
              )}
              <div>Supplier: <span className="font-medium">{first.poolItem.pool?.product?.supplier?.name || '—'}</span></div>
              <div>PO Number: <span className="font-medium">—</span></div>
              <div>Warehouse / 3PL: <span className="font-medium">—</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Soft CTA after delivered */}
      {overall === 'delivered' && product?.id && (
        <div className="mt-6 flex items-center gap-2">
          <a href={`/p/${product.id}`} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">Buy again</a>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Rate your order</button>
        </div>
      )}
    </div>
  );
}
