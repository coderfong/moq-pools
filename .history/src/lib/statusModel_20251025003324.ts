// Centralized status model for orders/shipments across the site

export type OrderStatus =
  | 'pending'
  | 'moq_reached'
  | 'preparing_shipment'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'canceled';

export const ORDER_STEPS: ReadonlyArray<{ key: Exclude<OrderStatus, 'exception' | 'canceled'>; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'moq_reached', label: 'MOQ reached' },
  { key: 'preparing_shipment', label: 'Preparing shipment' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const LEGACY_MAP: Record<string, OrderStatus> = {
  // Shipment-level common values
  'label_created': 'preparing_shipment',
  'processing': 'preparing_shipment',
  'preparing': 'preparing_shipment',
  'packed': 'preparing_shipment',
  'shipped': 'in_transit',
  'in-transit': 'in_transit',
  'in_transit': 'in_transit',
  'out_for_delivery': 'out_for_delivery',
  'out-for-delivery': 'out_for_delivery',
  'delivered': 'delivered',
  'exception': 'exception',
  'failed': 'exception',
  'cancelled': 'canceled',
  'canceled': 'canceled',
} as const;

export function normalizeStatus(s?: string | null): OrderStatus {
  const k = String(s || '').trim().toLowerCase();
  if (!k) return 'pending';
  if (k in LEGACY_MAP) return LEGACY_MAP[k as keyof typeof LEGACY_MAP];
  // Already a valid key?
  if ((ORDER_STEPS as any).some((st: any) => st.key === k)) return k as OrderStatus;
  if (k === 'moq_reached') return 'moq_reached';
  if (k === 'preparing_shipment') return 'preparing_shipment';
  return 'pending';
}

export function statusToStepIndex(status: OrderStatus): number {
  const idx = ORDER_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

export function computeProgress(status: OrderStatus) {
  const steps = ORDER_STEPS.map(s => s.label);
  const activeIndex = statusToStepIndex(status);
  const percent = Math.max(0, Math.min(1, activeIndex / (ORDER_STEPS.length - 1)));
  return { steps, activeIndex, percent };
}

export function isException(status: OrderStatus): boolean {
  return status === 'exception';
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'canceled';
}

export function getBadgeMeta(status: OrderStatus): { label: string; cls: string } {
  switch (status) {
    case 'pending': return { label: 'Pending', cls: 'bg-amber-100 text-amber-800' };
    case 'moq_reached': return { label: 'MOQ reached', cls: 'bg-indigo-100 text-indigo-800' };
    case 'preparing_shipment': return { label: 'Preparing', cls: 'bg-sky-100 text-sky-800' };
    case 'in_transit': return { label: 'In transit', cls: 'bg-blue-100 text-blue-800' };
    case 'out_for_delivery': return { label: 'Out for delivery', cls: 'bg-cyan-100 text-cyan-800' };
    case 'delivered': return { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-800' };
    case 'exception': return { label: 'Action required', cls: 'bg-red-100 text-red-800' };
    case 'canceled': return { label: 'Canceled', cls: 'bg-neutral-200 text-neutral-800' };
  }
}

export function overallFromShipments(statuses: Array<string | null | undefined>): OrderStatus {
  const norm = statuses.map(s => normalizeStatus(s));
  if (norm.length === 0) return 'pending';
  // If any exception and not all delivered -> exception banner
  if (norm.some(s => s === 'exception') && !norm.every(s => s === 'delivered')) return 'exception';
  if (norm.every(s => s === 'delivered')) return 'delivered';
  if (norm.some(s => s === 'out_for_delivery')) return 'out_for_delivery';
  if (norm.some(s => s === 'in_transit')) return 'in_transit';
  if (norm.some(s => s === 'preparing_shipment')) return 'preparing_shipment';
  // fallbacks
  if (norm.some(s => s === 'moq_reached')) return 'moq_reached';
  return 'pending';
}
