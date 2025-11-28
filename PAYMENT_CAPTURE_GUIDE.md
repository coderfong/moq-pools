# Payment Capture Guide - When Pool Reaches MOQ & Deadline

## Overview
When a pool reaches its MOQ (Minimum Order Quantity) and the deadline expires, the platform needs to **capture payments from escrow** and transition the pool to ACTIVE status so the order can be placed with the supplier.

## System Architecture

### 1. **Escrow Payment Flow**
- When users join a pool, their payment is **AUTHORIZED** (held in escrow) via Stripe
- Funds are NOT charged immediately - they're just reserved
- Payment status: `AUTHORIZED` → `CAPTURED` (when MOQ reached)
- If pool fails to reach MOQ: `AUTHORIZED` → `REFUNDED`

### 2. **Pool Lifecycle States**
```
OPEN → MOQ Not Reached → CANCELLED (refund)
     → MOQ Reached → ACTIVE (capture payments)
```

## Automated Payment Capture

### Cron Job (Recommended)
**File:** `app/api/cron/check-pools/route.ts`

**How it works:**
1. Runs periodically (configure with Vercel Cron or similar)
2. Finds all pools with status `OPEN` and `deadlineAt <= now`
3. For each expired pool:
   - **If MOQ reached:** Calls capture-payments API
   - **If MOQ not reached:** Calls refund-payments API

**Setup:**
```bash
# Set environment variable
CRON_SECRET=your-secret-key-here

# Add to vercel.json
{
  "crons": [{
    "path": "/api/cron/check-pools",
    "schedule": "0 * * * *"  # Every hour
  }]
}
```

**Manual trigger:**
```bash
curl -X GET http://localhost:3007/api/cron/check-pools \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Manual Payment Capture

### API Endpoint
**POST** `/api/pools/capture-payments`

**Authentication:** Requires admin session

**Request Body:**
```json
{
  "poolId": "clxxxxxxxxxxxxxx"
}
```

**Example:**
```bash
curl -X POST http://localhost:3007/api/pools/capture-payments \
  -H "Content-Type: application/json" \
  -H "Cookie: session-token=YOUR_SESSION" \
  -d '{"poolId":"cm123abc..."}'
```

### What Happens During Capture

**File:** `app/api/pools/capture-payments/route.ts`

**Process:**
1. **Validation:**
   - Checks if pool exists
   - Verifies `pledgedQty >= targetQty` (MOQ reached)
   - Ensures not already captured (`moqReachedAt` is null)

2. **Payment Processing:**
   - For each pool item with `PENDING` or `AUTHORIZED` payment:
   - Calls `stripe.paymentIntents.capture(paymentIntentId)`
   - Updates payment status to `CAPTURED` with `paidAt` timestamp
   - On failure: Updates to `FAILED` status

3. **Pool Update:**
   - Sets pool status to `ACTIVE`
   - Records `moqReachedAt` timestamp
   - This prevents duplicate captures

4. **Response:**
```json
{
  "success": true,
  "poolId": "cm123...",
  "poolTitle": "Product Name",
  "moqReachedAt": "2025-11-28T10:30:00Z",
  "captureResults": [
    {
      "paymentId": "pay_123",
      "userId": "user_456",
      "amount": 4999,
      "currency": "usd",
      "stripeIntentId": "pi_xyz",
      "success": true
    }
  ],
  "summary": {
    "total": 10,
    "succeeded": 10,
    "failed": 0
  }
}
```

## Test Mode vs Production

### Test Mode (No Stripe Key)
- Mocks payment captures
- Updates database status only
- No actual Stripe API calls
- Good for local development

### Production Mode (With Stripe Key)
```bash
STRIPE_SECRET_KEY=sk_live_...
```
- Makes real Stripe API calls
- Actually captures funds from customer cards
- Use carefully!

## Admin Dashboard Integration

### Manual Capture Button
You can add an admin interface to trigger captures:

**Example Admin Panel:**
```tsx
// app/admin/pools/page.tsx
async function capturePoolPayments(poolId: string) {
  const response = await fetch('/api/pools/capture-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poolId }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert(`Captured ${result.summary.succeeded} payments!`);
  } else {
    alert(`Error: ${result.error}`);
  }
}

// In your admin UI
<button onClick={() => capturePoolPayments(pool.id)}>
  Capture Payments
</button>
```

## Database Schema Reference

### Pool Model
```prisma
model Pool {
  id            String      @id @default(cuid())
  status        PoolStatus  // OPEN → ACTIVE when payments captured
  pledgedQty    Int         // Must be >= targetQty
  targetQty     Int         // MOQ threshold
  deadlineAt    DateTime    // Deadline for reaching MOQ
  moqReachedAt  DateTime?   // Timestamp when payments were captured
  // ... other fields
}
```

### Payment Model
```prisma
model Payment {
  id        String     @id @default(cuid())
  status    PayStatus  // AUTHORIZED → CAPTURED
  reference String?    // Stripe PaymentIntent ID (pi_xxxx)
  amount    Decimal
  currency  String
  paidAt    DateTime?  // Set when captured
  // ... other fields
}
```

## Error Handling

### Common Issues

**1. Payment Intent Already Captured**
```
Stripe Error: This PaymentIntent has already been captured
```
→ The payment was already processed. Check if `moqReachedAt` is set.

**2. Payment Intent Cancelled/Expired**
```
Stripe Error: This PaymentIntent cannot be captured as the payment has expired
```
→ Authorization expired (usually after 7 days). Need to refund instead.

**3. Pool Not at MOQ**
```
{ "error": "Pool has not reached MOQ yet", "pledgedQty": 8, "targetQty": 10 }
```
→ Wait for more participants or trigger refund if deadline passed.

**4. Already Captured**
```
{ "error": "Pool payments already captured", "capturedAt": "..." }
```
→ Pool was already processed. Check `moqReachedAt` field.

## Best Practices

### 1. **Use Cron Job for Automation**
   - Set up hourly checks
   - Ensures timely processing
   - No manual intervention needed

### 2. **Monitor Deadline Buffer**
   - Don't set deadlines too tight
   - Give 1-2 hours after deadline before processing
   - Allows last-minute joins

### 3. **Notification Flow**
   - Email users when pool reaches MOQ
   - Notify again when payments captured
   - Send order confirmation with tracking

### 4. **Test in Development**
   - Use test mode to verify flow
   - Test both success and failure scenarios
   - Verify database state transitions

### 5. **Error Recovery**
   - Failed captures are marked as `FAILED`
   - Can be retried manually if needed
   - Log all capture attempts for audit trail

## Next Steps After Capture

Once payments are captured:

1. **Update Pool Status** ✅ (Automatic: `ACTIVE`)
2. **Update PoolItem Status** → `PAYMENT_CONFIRMED`
3. **Place Order with Supplier** (Manual or via supplier API)
4. **Send Confirmation Emails** (Use `sendPaymentCapturedEmail`)
5. **Create Admin Task** for order processing
6. **Update PoolItem Status** → `ORDER_PLACED`
7. **Track Shipment** → Update to `IN_TRANSIT`, `DELIVERED`

## Monitoring & Debugging

### Check Pool Status
```sql
SELECT 
  id,
  status,
  pledgedQty,
  targetQty,
  deadlineAt,
  moqReachedAt,
  createdAt
FROM "Pool"
WHERE status = 'OPEN'
  AND deadlineAt < NOW();
```

### Check Payment Status
```sql
SELECT 
  p.id,
  p.status,
  p.reference,
  p.amount,
  p.paidAt,
  pi.poolId
FROM "Payment" p
JOIN "PoolItem" pi ON pi."paymentId" = p.id
WHERE pi."poolId" = 'YOUR_POOL_ID';
```

### View Cron Job Logs
Check Vercel logs or your server logs for:
```
[Cron] Checking pools at 2025-11-28T10:00:00Z
[Cron] Found 2 expired pools
[Cron] Pool cm123... (Product Name): 12/10 - MOQ REACHED
[Cron] Pool cm123... payments captured: SUCCESS
```

## Summary

**Automatic (Recommended):**
- Set up cron job at `/api/cron/check-pools`
- Runs hourly, processes expired pools automatically
- Captures payments if MOQ reached, refunds if not

**Manual (When Needed):**
- Call `POST /api/pools/capture-payments` with `poolId`
- Requires admin authentication
- Useful for testing or one-off captures

**Result:**
- Payments captured from escrow → actual charge
- Pool status: `OPEN` → `ACTIVE`
- Ready to place order with supplier
