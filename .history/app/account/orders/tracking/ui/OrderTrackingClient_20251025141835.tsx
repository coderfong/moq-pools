"use client";
import React, { useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import ShippingProgress from "@/components/ShippingProgress";
import { overallFromShipments, normalizeStatus, OrderStatus } from "@/lib/statusModel";
import { computeDynamicEta, detectEdgeCase, shipmentRoute } from "@/lib/shippingEta";

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

// Legacy helpers removed in favor of centralized status model

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
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState('');
  const [supportMeta, setSupportMeta] = useState<{ orderId?: string; shipmentId?: string; tracking?: string } | null>(null);
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportDone, setSupportDone] = useState<null | 'ok' | 'error'>(null);

  // Empty state
  if (!shipments || shipments.length === 0) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
        <div className="flex items-start gap-3">
          <span className="inline-block size-2 mt-1.5 rounded-full bg-neutral-300" />
          <div>
            <div className="font-medium text-neutral-900">No shipments yet</div>
            <div className="mt-1">We’ll notify you once your order ships. You can check back here for ETA and tracking updates.</div>
          </div>
        </div>
      </div>
    );
  }
  const filteredShipments = useMemo(() => {
    if (filter === 'all') return shipments;
    return shipments.slice(filter, filter + 1);
  }, [filter, shipments]);

  const first = shipments[0];
  const orderId = first?.poolItem?.id ? `ORD-${shortId(first.poolItem.id)}` : 'ORD-—';
  const groupId = first?.poolItem?.pool?.id ? `GRP-${shortId(first.poolItem.pool.id)}` : null;
  const placedAt = first?.poolItem?.createdAt ? formatDate(first.poolItem.createdAt) : null;
  const overall: OrderStatus = overallFromShipments(shipments.map((s:any) => s.status));
  // Compute an overall ETA: take the latest ETA among undelivered shipments for a conservative estimate
  const etaDates: Date[] = shipments
    .filter((s:any) => normalizeStatus(s.status) !== 'delivered')
    .map((s:any) => {
      const dyn = computeDynamicEta(s);
      return dyn.etaDate || (s.etaDate ? new Date(s.etaDate) : null);
    })
    .filter(Boolean) as Date[];
  const overallEta = etaDates.length ? new Date(Math.max(...etaDates.map(d => d.getTime()))) : null;
  const etaStr = overallEta ? `${formatDate(overallEta)} (±2 days)` : '—';

  // Split-shipment summary helper
  const deliveredCount = shipments.filter((s:any) => normalizeStatus(s.status) === 'delivered').length;
  const totalCount = shipments.length;
  const remainingLabel = (() => {
    if (totalCount <= 1 || deliveredCount === 0 || deliveredCount === totalCount) return null;
    const remainingStatuses = shipments
      .filter((s:any) => normalizeStatus(s.status) !== 'delivered')
      .map((s:any) => normalizeStatus(s.status));
    let label = 'remaining';
    if (remainingStatuses.some((x:string) => x === 'in_transit')) label = 'remaining in transit';
    else if (remainingStatuses.some((x:string) => x === 'preparing_shipment')) label = 'remaining preparing';
    return `${deliveredCount} of ${totalCount} delivered — ${label}.`;
  })();
  const isPartiallyShipped = deliveredCount > 0 && deliveredCount < totalCount;

  const product = first?.poolItem?.pool?.product;
  const images = parseImages(product?.imagesJson);

  async function submitSupport() {
    if (supportBusy) return;
    setSupportBusy(true);
    setSupportDone(null);
    try {
      const res = await fetch('/api/support/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          shipmentId: supportMeta?.shipmentId,
          tracking: supportMeta?.tracking,
          message: supportText,
        }),
      });
      if (res.ok) {
        setSupportDone('ok');
      } else {
        setSupportDone('error');
      }
    } catch {
      setSupportDone('error');
    } finally {
      setSupportBusy(false);
    }
  }
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
              {remainingLabel && (
                <div className="mt-1 text-xs text-neutral-500">{remainingLabel}</div>
              )}
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            <StatusBadge status={overall} />
            {isPartiallyShipped && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">Partially shipped</span>
            )}
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
          const dyn = computeDynamicEta(s);
          const eta = dyn.mode === 'pre_scan'
            ? dyn.rangeLabel
            : (dyn.etaDate ? `${formatDate(dyn.etaDate)} (±2 days)` : null);
          const tracking = s.trackingNo || '';
          const st = normalizeStatus(s.status);
          const code = `SHP-${shortId(s.id)}`;
          const edge = detectEdgeCase(s);
          const route = shipmentRoute(s);
          const qty = s.poolItem?.quantity || null;
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
                      <StatusBadge status={st} />
                      <span>•</span>
                      <span>Last update {created}</span>
                      {eta && (<><span>•</span><span>ETA {eta}</span></>)}
                      {qty ? (<><span>•</span><span>Qty {qty}</span></>) : null}
                    </div>
                    {tracking && (
                      <div className="mt-1 text-sm">
                        Tracking: <span className="font-mono">{tracking}</span>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-neutral-500">
                      Route: {route.from || '—'} → {route.to || '—'}
                    </div>
                    {dyn.stale && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        <span className="inline-block size-2 rounded-full bg-amber-500" />
                        <span>Slight delay, updated ETA: {eta || '—'}</span>
                        <button
                          className="underline underline-offset-2"
                          onClick={() => {
                            setSupportMeta({ orderId, shipmentId: s.id, tracking });
                            setSupportText(`Delay on ${orderId} / ${code}\nTracking: ${tracking || '—'}\nPlease check latest status.`);
                            setSupportDone(null);
                            setSupportOpen(true);
                          }}
                        >Contact support</button>
                      </div>
                    )}
                    {edge && (
                      <div className="mt-2 space-y-1">
                        {edge.kind === 'label_no_movement' && (
                          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-50 px-2 py-1 text-xs text-neutral-700">
                            <span className="inline-block size-2 rounded-full bg-neutral-400" />
                            <span>Waiting for carrier pickup (common on weekends)</span>
                            <button
                              className="underline underline-offset-2"
                              onClick={() => {
                                setSupportMeta({ orderId, shipmentId: s.id, tracking });
                                setSupportText(`No movement in 48h for ${orderId} / ${code}\nTracking: ${tracking || '—'}\nPlease assist.`);
                                setSupportDone(null);
                                setSupportOpen(true);
                              }}
                            >Get help</button>
                          </div>
                        )}
                        {edge.kind === 'customs_hold' && (
                          <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            <span className="inline-block size-2 rounded-full bg-amber-500" />
                            <span>Customs clearance in progress{edge.action ? ` — ${edge.action}` : ''}</span>
                            <button
                              className="underline underline-offset-2"
                              onClick={() => {
                                setSupportMeta({ orderId, shipmentId: s.id, tracking });
                                setSupportText(`Customs hold for ${orderId} / ${code}\nTracking: ${tracking || '—'}\nPlease advise next steps (ID/taxes if required).`);
                                setSupportDone(null);
                                setSupportOpen(true);
                              }}
                            >Need help</button>
                          </div>
                        )}
                        {edge.kind === 'failed_delivery' && (
                          <div className="inline-flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
                            <span className="inline-block size-2 rounded-full bg-red-500" />
                            <span>Delivery attempt failed{edge.reason ? ` — ${edge.reason}` : ''}</span>
                            <button
                              className="underline underline-offset-2"
                              onClick={() => {
                                setSupportMeta({ orderId, shipmentId: s.id, tracking });
                                setSupportText(`Reschedule delivery for ${orderId} / ${code}\nTracking: ${tracking || '—'}\nPreferred days/times:`);
                                setSupportDone(null);
                                setSupportOpen(true);
                              }}
                            >Reschedule</button>
                            <button
                              className="underline underline-offset-2"
                              onClick={() => {
                                setSupportMeta({ orderId, shipmentId: s.id, tracking });
                                setSupportText(`Update address for ${orderId} / ${code}\nTracking: ${tracking || '—'}\nNew address:`);
                                setSupportDone(null);
                                setSupportOpen(true);
                              }}
                            >Update address</button>
                          </div>
                        )}
                        {edge.kind === 'lost' && (
                          <div className="inline-flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
                            <span className="inline-block size-2 rounded-full bg-red-500" />
                            <span>Shipment may be lost in transit</span>
                            <button
                              className="underline underline-offset-2"
                              onClick={() => {
                                setSupportMeta({ orderId, shipmentId: s.id, tracking });
                                setSupportText(`Shipment lost for ${orderId} / ${code}\nTracking: ${tracking || '—'}\nRequest re-ship or credit per policy.`);
                                setSupportDone(null);
                                setSupportOpen(true);
                              }}
                            >Contact support</button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2">
                      <ShippingProgress
                        status={st}
                        onResolveIssue={() => {
                          const text = `Support request for ${orderId}\nShipment: ${code}\nTracking: ${tracking || '—'}`;
                          if (typeof window !== 'undefined') {
                            try { navigator.clipboard.writeText(text); } catch {}
                            alert('Issue context copied. Paste into chat or email and we\'ll help.');
                          }
                          setSupportMeta({ orderId, shipmentId: s.id, tracking });
                          setSupportText(`Issue with ${orderId} / ${code}\nTracking: ${tracking || '—'}\n\nDescribe the problem:`);
                          setSupportDone(null);
                          setSupportOpen(true);
                        }}
                      />
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
                      setSupportMeta({ orderId, shipmentId: s.id, tracking });
                      setSupportText(`Issue with ${orderId} / ${code}\nTracking: ${tracking || '—'}\n\nDescribe the problem:`);
                      setSupportDone(null);
                      setSupportOpen(true);
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

      {/* Support Modal */}
      <Modal open={supportOpen} onClose={() => setSupportOpen(false)}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold">Report a delivery issue</h3>
            <button className="rounded-md px-2 py-1 text-sm hover:bg-neutral-100" onClick={() => setSupportOpen(false)}>Close</button>
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            We’ll review and get back to you. Include any helpful details (wrong address, tracking shows stuck, damaged item, etc.).
          </div>
          <label htmlFor="support-details" className="mt-3 block text-sm font-medium text-neutral-800">Details</label>
          <textarea
            id="support-details"
            className="mt-1 w-full rounded-lg border border-neutral-200 p-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 min-h-32"
            value={supportText}
            onChange={(e) => setSupportText(e.target.value)}
          />
          {supportDone === 'ok' && (
            <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-700">Issue sent. We’ll follow up via your account email.</div>
          )}
          {supportDone === 'error' && (
            <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">Couldn’t send right now. Please try again.</div>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={() => setSupportOpen(false)}>Cancel</button>
            <button
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              disabled={supportBusy || !supportText.trim()}
              onClick={submitSupport}
            >{supportBusy ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Inline lightweight modal to avoid pulling extra deps
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
