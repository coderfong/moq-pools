import { computeDynamicEta } from "../src/lib/shippingEta";

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const mockShipment = {
  carrier: 'YunExpress',
  status: 'in_transit',
  eventsJson: JSON.stringify([
    { message: 'Shipment accepted', time: daysAgo(7), location: 'Shenzhen, CN' },
    { message: 'Departed facility', time: daysAgo(5), location: 'Shenzhen, CN' },
    { message: 'Arrived at destination facility', time: daysAgo(1), location: 'Singapore' },
  ]),
  poolItem: { address: { country: 'SG' } },
};

const dyn = computeDynamicEta(mockShipment, now);
console.log({
  mode: dyn.mode,
  etaDate: dyn.etaDate?.toISOString(),
  stale: dyn.stale,
  elapsedDays: dyn.elapsedDays,
  delayDays: dyn.delayDays,
  base: dyn.base,
});
