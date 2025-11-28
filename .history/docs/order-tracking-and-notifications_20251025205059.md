# Order Tracking API and Notifications

This document summarizes the order tracking API, deep link page, and shipping notifications.

## API: GET /api/orders/:orderId/track

- Auth required (cookie session). Returns 401 if not signed in, 404 if the order is not found or not owned by the user.
- `orderId` accepts:
  - `ord_<PoolItemId>` (preferred external ID), or
  - raw `PoolItemId` cuid.
- Response shape:

```
{
  "order": {
    "id": "ord_...",
    "status": "pending|moq_reached|preparing_shipment|in_transit|out_for_delivery|delivered|exception|canceled",
    "placedAt": "ISO8601",
    "eta": "YYYY-MM-DD|null",
    "items": [ { "sku":"...", "title":"...", "image":"...", "qty":1 } ],
    "address": { "name":"...", "phone":"...", "line1":"...", "city":"...", "country":"...", "postal":"..." },
    "payment": { "status":"pending|captured|...", "capturedAt":"ISO8601|null" }
  },
  "shipments": [
    {
      "id": "...",
      "carrier": "...",
      "trackingNumber": "...",
      "status": "preparing_shipment|in_transit|out_for_delivery|delivered|exception|pending",
      "eta": "YYYY-MM-DD|null",
      "items": [ { "sku":"...", "qty":1 } ],
      "events": [ { "ts":"ISO8601", "status":"in_transit|...", "loc":"...", "desc":"..." } ],
      "links": { "carrierTrack":"https://track.aftership.com/<tracking>" }
    }
  ]
}
```

Implementation: `app/api/orders/[orderId]/track/route.ts`.

## Deep Link Page

- Route: `/orders/:orderId/track`
- Renders the existing tracking UI (`OrderTrackingClient`) scoped to a single order.
- File: `app/orders/[orderId]/track/page.tsx`

## Notifications (Messages > Alerts)

We emit alerts for key shipping milestones and group progress:

- MOQ reached → title: "MOQ reached"; body: "Charging now; preparing your shipment."
- First pickup scan (first move to IN_TRANSIT) → "Picked up by courier."
- Out for delivery (detected from shipment events) → "Arriving today."
- Delivered → "Delivered — rate your order."

All shipping alerts deep-link to `/orders/:orderId/track`.

### Emit on shipment updates

Use `emitShipmentAlertsOnUpdate(prev, next)` whenever you persist a Shipment update.

```
import { emitShipmentAlertsOnUpdate } from '@/lib/shippingAlerts';

// Before update, load previous snapshot
const prev = { id, poolItemId, status: old.status, eventsJson: old.eventsJson, trackingNo: old.trackingNo };

// Apply your changes and get new state as `next`
const next = { id, poolItemId, status: newRow.status, eventsJson: newRow.eventsJson, trackingNo: newRow.trackingNo };

await emitShipmentAlertsOnUpdate(prev, next);
```

Helper location: `src/lib/shippingAlerts.ts`.

### Group progress events

These already exist in `src/lib/alerts.ts` with idempotent milestone logic. MOQ reached copy updated to match tracking UI.

## DB Indexes

- `PoolItem`: `@@index([userId, createdAt])` — accelerates per-user order lists.
- `Shipment`: `@@index([trackingNo])` — accelerates tracking lookups.

Run Prisma migration to apply these indexes in your DB.

## Notes

- This codebase models an order as a `PoolItem`. External IDs are exposed as `ord_<PoolItemId>` in the API response and deep links.
- Shipment statuses are normalized in `src/lib/statusModel.ts`.
