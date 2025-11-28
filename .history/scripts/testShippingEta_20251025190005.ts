import { computeDynamicEta, detectEdgeCase } from "../src/lib/shippingEta";

const now = new Date();
const dAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const cases = [
  {
    name: 'Pre-scan CN→SG Economy (label created) no movement 50h',
    s: {
      carrier: 'Yanwen',
      status: 'label_created',
      createdAt: dAgo(3),
      eventsJson: JSON.stringify([]),
      poolItem: { address: { country: 'SG' } },
    },
  },
  {
    name: 'Post-scan CN→US Standard in-transit, last scan fresh',
    s: {
      carrier: 'SF Express',
      status: 'in_transit',
      createdAt: dAgo(7),
      eventsJson: JSON.stringify([
        { message: 'Accepted', time: dAgo(6), location: 'Shenzhen, CN' },
        { message: 'Departed facility', time: dAgo(5), location: 'Shenzhen, CN' },
        { message: 'In transit', time: dAgo(1), location: 'Los Angeles, US' },
      ]),
      poolItem: { address: { country: 'US' } },
    },
  },
  {
    name: 'Post-scan CN→IN Economy, last scan stale 80h',
    s: {
      carrier: 'YunExpress',
      status: 'in_transit',
      createdAt: dAgo(10),
      eventsJson: JSON.stringify([
        { message: 'Picked up', time: dAgo(7), location: 'Shenzhen, CN' },
        { message: 'In transit', time: dAgo(3.5), location: 'Kolkata, IN' },
      ]),
      poolItem: { address: { country: 'IN' } },
    },
  },
  {
    name: 'Customs hold detected',
    s: {
      carrier: '4PX',
      status: 'in_transit',
      createdAt: dAgo(6),
      eventsJson: JSON.stringify([
        { message: 'Arrived at destination', time: dAgo(3), location: 'Sydney, AU' },
        { message: 'Customs hold: awaiting duty payment', time: dAgo(1), location: 'Sydney, AU' },
      ]),
      poolItem: { address: { country: 'AU' } },
    },
  },
  {
    name: 'Failed delivery attempt',
    s: {
      carrier: 'SingPost',
      status: 'exception',
      createdAt: dAgo(5),
      eventsJson: JSON.stringify([
        { message: 'Out for delivery', time: dAgo(1), location: 'Singapore' },
        { message: 'Failed delivery: recipient unavailable', time: dAgo(0.3), location: 'Singapore' },
      ]),
      poolItem: { address: { country: 'SG' } },
    },
  },
];

for (const c of cases) {
  const dyn = computeDynamicEta(c.s as any, now);
  const edge = detectEdgeCase(c.s as any, now);
  console.log('\n==', c.name);
  console.log({
    mode: dyn.mode,
    etaDate: dyn.etaDate ? dyn.etaDate.toISOString() : null,
    rangeLabel: dyn.rangeLabel,
    stale: dyn.stale,
    elapsedDays: dyn.elapsedDays,
    delayDays: dyn.delayDays,
    edge,
  });
}
