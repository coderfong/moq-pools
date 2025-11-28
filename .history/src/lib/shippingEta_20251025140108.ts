// ETA and shipping issue heuristics for the order tracking page
// Lightweight and data-agnostic: works with the Shipment Prisma model shape

export type ServiceLevel = 'ECONOMY' | 'STANDARD' | 'EXPRESS';

export type RouteSLA = { minDays: number; maxDays: number; label: string };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function getRouteSla(from?: string | null, to?: string | null, level: ServiceLevel = 'ECONOMY'): RouteSLA {
  const f = (from || 'CN').toUpperCase();
  const t = (to || '').toUpperCase();
  const L = level.toUpperCase() as ServiceLevel;

  // Basic routing heuristics; defaults chosen conservatively for cross-border ecom
  // Numbers represent door-to-door days after first scan
  const table: Record<string, Record<string, Record<ServiceLevel, RouteSLA>>> = {
    CN: {
      SG: {
        ECONOMY: { minDays: 6, maxDays: 10, label: 'Economy 6–10 days' },
        STANDARD: { minDays: 4, maxDays: 7, label: 'Standard 4–7 days' },
        EXPRESS: { minDays: 2, maxDays: 4, label: 'Express 2–4 days' },
      },
      US: {
        ECONOMY: { minDays: 8, maxDays: 16, label: 'Economy 8–16 days' },
        STANDARD: { minDays: 6, maxDays: 10, label: 'Standard 6–10 days' },
        EXPRESS: { minDays: 3, maxDays: 6, label: 'Express 3–6 days' },
      },
      IN: {
        ECONOMY: { minDays: 7, maxDays: 12, label: 'Economy 7–12 days' },
        STANDARD: { minDays: 5, maxDays: 9, label: 'Standard 5–9 days' },
        EXPRESS: { minDays: 3, maxDays: 6, label: 'Express 3–6 days' },
      },
      AU: {
        ECONOMY: { minDays: 7, maxDays: 12, label: 'Economy 7–12 days' },
        STANDARD: { minDays: 5, maxDays: 9, label: 'Standard 5–9 days' },
        EXPRESS: { minDays: 3, maxDays: 6, label: 'Express 3–6 days' },
      },
      MY: {
        ECONOMY: { minDays: 5, maxDays: 9, label: 'Economy 5–9 days' },
        STANDARD: { minDays: 4, maxDays: 7, label: 'Standard 4–7 days' },
        EXPRESS: { minDays: 2, maxDays: 4, label: 'Express 2–4 days' },
      },
      DEFAULT: {
        ECONOMY: { minDays: 7, maxDays: 14, label: 'Economy 7–14 days' },
        STANDARD: { minDays: 5, maxDays: 10, label: 'Standard 5–10 days' },
        EXPRESS: { minDays: 3, maxDays: 7, label: 'Express 3–7 days' },
      },
    },
  } as const;

  const byFrom = table[f as keyof typeof table] || table.CN;
  const byTo = (byFrom as any)[t] || (byFrom as any).DEFAULT;
  return byTo[L] || byTo.ECONOMY;
}

export type TrackingEvent = { message?: string; time?: string | Date; location?: string };

export function parseEvents(eventsJson?: string | null): TrackingEvent[] {
  if (!eventsJson) return [];
  try {
    const arr = JSON.parse(eventsJson);
    if (Array.isArray(arr)) return arr as TrackingEvent[];
  } catch {}
  return [];
}

export function parseDateLoose(v?: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function carrierDelayFactor(carrier?: string | null, hoursSinceLastScan?: number): number {
  const c = (carrier || '').toLowerCase();
  // Simple heuristic: if stale >72h add +2d, >48h add +1d, else 0
  const h = hoursSinceLastScan ?? 0;
  if (h >= 72) return 2;
  if (h >= 48) return 1;
  // Some carriers/routes trend slower; add a tiny bias
  if (/singpost|yanwen|yunas|4px|sunyou/.test(c)) return 1;
  return 0;
}

export function inferServiceLevelFromCarrier(carrier?: string | null): ServiceLevel {
  const c = (carrier || '').toLowerCase();
  if (/express|dhl|ups|fedex/.test(c)) return 'EXPRESS';
  if (/sf|standard|air/i.test(c)) return 'STANDARD';
  return 'ECONOMY';
}

export function shipmentRoute(shipment: any): { from: string | null; to: string | null; level: ServiceLevel } {
  const to = shipment?.poolItem?.address?.country || null;
  // Most suppliers originate from CN in our catalog; adjust when supplier country is modeled
  const from = 'CN';
  const level = inferServiceLevelFromCarrier(shipment?.carrier);
  return { from, to, level };
}

export function computeDynamicEta(shipment: any, now: Date = new Date()) {
  const { from, to, level } = shipmentRoute(shipment);
  const base = getRouteSla(from, to, level);
  const events = parseEvents(shipment?.eventsJson);
  const lastEv = events && events.length ? events[events.length - 1] : null;
  const firstEv = events && events.length ? events[0] : null;
  const firstScanAt = parseDateLoose(firstEv?.time);
  const lastScanAt = parseDateLoose(lastEv?.time);

  const hoursSinceLastScan = lastScanAt ? (now.getTime() - lastScanAt.getTime()) / 36e5 : null;
  const stale = hoursSinceLastScan !== null ? hoursSinceLastScan >= 72 : false;

  // Before first scan: show base SLA window (no specific ETA date possible)
  if (!firstScanAt) {
    return {
      mode: 'pre_scan' as const,
      etaDate: null as Date | null,
      rangeLabel: base.label,
      base,
      stale,
      firstScanAt: null as Date | null,
      lastScanAt,
      elapsedDays: 0,
      delayDays: hoursSinceLastScan ? carrierDelayFactor(shipment?.carrier, hoursSinceLastScan) : 0,
    };
  }

  // After first scan: dynamic ETA = base midpoint – elapsed + delay factor
  const elapsedDays = clamp(Math.floor((now.getTime() - firstScanAt.getTime()) / 86400000), 0, 365);
  const midpoint = Math.round((base.minDays + base.maxDays) / 2);
  const delayDays = carrierDelayFactor(shipment?.carrier, hoursSinceLastScan || undefined);
  const daysLeft = clamp(midpoint - elapsedDays + delayDays, 1, base.maxDays);
  const eta = new Date(now.getTime() + daysLeft * 86400000);

  return {
    mode: 'post_scan' as const,
    etaDate: eta,
    rangeLabel: `${base.label.replace(/\s*days?$/i, '')}`,
    base,
    stale,
    firstScanAt,
    lastScanAt,
    elapsedDays,
    delayDays,
  };
}

export type EdgeCase =
  | { kind: 'label_no_movement'; message: string }
  | { kind: 'customs_hold'; message: string; action?: string }
  | { kind: 'failed_delivery'; message: string; reason?: string }
  | { kind: 'lost'; message: string }
  | null;

export function detectEdgeCase(shipment: any, now: Date = new Date()): EdgeCase {
  const events = parseEvents(shipment?.eventsJson);
  const newest = events && events.length ? events[events.length - 1] : null;
  const newestMsg = (newest?.message || '').toLowerCase();
  const createdAt = shipment?.createdAt ? parseDateLoose(shipment.createdAt) : null;
  const hasMoves = events.length > 0;
  const hoursSinceCreate = createdAt ? (now.getTime() - createdAt.getTime()) / 36e5 : 0;

  // Label created no movement in 48h
  const status = String(shipment?.status || '').toLowerCase();
  if ((status.includes('label') || status.includes('preparing')) && !hasMoves && hoursSinceCreate >= 48) {
    return { kind: 'label_no_movement', message: 'Waiting for carrier pickup (common on weekends)' };
  }

  // Customs hold
  if (/customs|clearance|import hold|awaiting duty|awaiting tax/.test(newestMsg)) {
    const action = /id|identity|passport|tax|dut(y|ies)/.test(newestMsg) ? 'Additional ID or taxes may be required' : undefined;
    return { kind: 'customs_hold', message: 'Shipment is in customs clearance', action };
  }

  // Failed delivery
  if (/failed delivery|delivery attempt|recipient unavailable|address issue|insufficient address/.test(newestMsg)) {
    return { kind: 'failed_delivery', message: 'Delivery attempt failed', reason: newest?.message };
  }

  // Lost
  if (/lost|package lost|shipment lost|not found after investigation/.test(newestMsg)) {
    return { kind: 'lost', message: 'Shipment may be lost in transit' };
  }

  return null;
}
