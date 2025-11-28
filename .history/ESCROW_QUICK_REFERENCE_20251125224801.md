# Escrow Payment Quick Reference

## Common Operations

### Manually Capture Payments for a Pool
When a pool reaches MOQ and you want to capture payments immediately:

```bash
curl -X POST https://your-domain.com/api/pools/capture-payments \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "poolId": "clxx1234567890"
  }'
```

**Response:**
```json
{
  "success": true,
  "poolId": "clxx1234567890",
  "poolTitle": "Product Name",
  "moqReachedAt": "2025-11-25T10:30:00.000Z",
  "summary": {
    "total": 5,
    "succeeded": 5,
    "failed": 0
  }
}
```

---

### Manually Refund a Pool
When a pool fails to reach MOQ or needs to be cancelled:

```bash
curl -X POST https://your-domain.com/api/pools/refund-payments \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "poolId": "clxx1234567890",
    "reason": "Pool cancelled by admin"
  }'
```

---

### Check Pool Status
```sql
SELECT 
  p.id,
  p.status,
  p.pledgedQty,
  p.targetQty,
  p.deadlineAt,
  p.moqReachedAt,
  COUNT(pi.id) as participant_count,
  COUNT(CASE WHEN pay.status = 'AUTHORIZED' THEN 1 END) as authorized_payments,
  COUNT(CASE WHEN pay.status = 'CAPTURED' THEN 1 END) as captured_payments
FROM "Pool" p
LEFT JOIN "PoolItem" pi ON pi."poolId" = p.id
LEFT JOIN "Payment" pay ON pay."poolItemId" = pi.id
WHERE p.id = 'clxx1234567890'
GROUP BY p.id;
```

---

### Find Pools Ready for Capture
```sql
SELECT 
  p.id,
  pr.title as product_name,
  p.pledgedQty,
  p.targetQty,
  p.deadlineAt,
  COUNT(pi.id) as participants
FROM "Pool" p
JOIN "Product" pr ON pr.id = p."productId"
LEFT JOIN "PoolItem" pi ON pi."poolId" = p.id
WHERE p.status = 'OPEN'
  AND p.pledgedQty >= p.targetQty
  AND p.deadlineAt < NOW()
  AND p."moqReachedAt" IS NULL
GROUP BY p.id, pr.title;
```

---

### Find Pools That Failed MOQ
```sql
SELECT 
  p.id,
  pr.title as product_name,
  p.pledgedQty,
  p.targetQty,
  p.deadlineAt,
  COUNT(pi.id) as participants
FROM "Pool" p
JOIN "Product" pr ON pr.id = p."productId"
LEFT JOIN "PoolItem" pi ON pi."poolId" = p.id
WHERE p.status = 'OPEN'
  AND p.pledgedQty < p.targetQty
  AND p.deadlineAt < NOW()
GROUP BY p.id, pr.title;
```

---

### View Payment Status for a Pool
```sql
SELECT 
  u.email,
  pi.quantity,
  pay.amount,
  pay.currency,
  pay.status,
  pay.reference as stripe_payment_intent_id,
  pay."paidAt"
FROM "PoolItem" pi
JOIN "User" u ON u.id = pi."userId"
JOIN "Payment" pay ON pay."poolItemId" = pi.id
WHERE pi."poolId" = 'clxx1234567890'
ORDER BY pay."createdAt";
```

---

### Trigger Cron Job Manually
```bash
curl -X GET https://your-domain.com/api/cron/check-pools \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Troubleshooting

### Payment Stuck in AUTHORIZED
**Problem:** Payment has been authorized for more than 7 days

**Solution:**
1. Check if pool deadline passed
2. Manually trigger capture if MOQ reached:
   ```bash
   curl -X POST /api/pools/capture-payments -d '{"poolId":"..."}'
   ```
3. Or refund if pool failed:
   ```bash
   curl -X POST /api/pools/refund-payments -d '{"poolId":"..."}'
   ```

---

### Cron Job Not Running
**Check:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check Vercel Dashboard → Cron Jobs section
3. Verify `vercel.json` is committed to repo
4. Check cron job logs in Vercel

**Manual trigger:**
```bash
curl -X GET https://your-domain.com/api/cron/check-pools \
  -H "Authorization: Bearer your-cron-secret"
```

---

### Stripe "Payment Intent Not Found" Error
**Causes:**
- Payment Intent ID not saved in database
- Using test key with live Payment Intent (or vice versa)
- Payment Intent expired (>7 days old)

**Fix:**
1. Check Payment record has `reference` field populated
2. Verify Stripe keys match (test/live)
3. If expired, mark as EXPIRED and create new payment

---

### Pool Status Not Updating
**Check:**
1. Cron job is running (check logs)
2. Pool deadline has passed
3. No errors in capture/refund endpoints
4. Database transaction succeeded

**Manual fix:**
```sql
-- If payments captured but pool status not updated
UPDATE "Pool" 
SET status = 'ACTIVE', "moqReachedAt" = NOW()
WHERE id = 'clxx1234567890';

-- If payments refunded but pool status not updated
UPDATE "Pool"
SET status = 'CANCELLED'
WHERE id = 'clxx1234567890';
```

---

## Environment Variables Reference

```bash
# Required
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
CRON_SECRET=your_secure_random_string_here
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional but recommended
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Payment Status Flow

```
User Joins Pool
     ↓
PENDING / REQUIRES_ACTION
     ↓
User Confirms Payment
     ↓
AUTHORIZED (funds held)
     ↓
    / \
   /   \
MOQ     No MOQ
Reached  Reached
  ↓        ↓
CAPTURED  REFUNDED
(charged) (released)
```

---

## Cron Schedule Format

Current: `"0 * * * *"` = Every hour at minute 0

Common schedules:
- Every hour: `"0 * * * *"`
- Every 30 mins: `"*/30 * * * *"`
- Every 15 mins: `"*/15 * * * *"`
- Daily at 2am: `"0 2 * * *"`
- Every 6 hours: `"0 */6 * * *"`

Format: `minute hour day month weekday`
