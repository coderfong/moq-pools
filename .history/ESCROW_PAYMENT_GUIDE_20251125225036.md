# Escrow / Payment Hold Implementation Guide

## Overview
This guide explains how to implement **payment authorization holds** (escrow-like functionality) where funds are authorized but not captured until the pool reaches MOQ.

## Current Implementation Status

✅ **Already Set Up:**
- Stripe integration configured
- Payment Intent API endpoint: `/api/payment/create-intent`
- Payment model in database with `status` field
- UI mentions "payment held in escrow"

❌ **Missing / Needs Implementation:**
- Authorization vs. Capture separation
- Webhook handling for pool completion
- Auto-refund when pool fails
- Payment status tracking

---

## Implementation Steps

### 1. **Modify Payment Intent Creation (Authorization Hold)**

Update `/app/api/payment/create-intent/route.ts`:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100),
  currency: currency.toLowerCase(),
  metadata: {
    listingId: listingId || '',
    poolId: poolId || '',
    quantity: quantity.toString(),
    userId: session.sub || '',
  },
  description: `MOQ Pool Order - ${quantity} units`,
  receipt_email: email,
  payment_method_types: ['card'],
  
  // KEY CHANGE: Use manual capture mode for authorization hold
  capture_method: 'manual',  // ⭐ This holds the funds without capturing
  
  // Optional: Set how long to hold (Stripe default is 7 days for cards)
  // After 7 days, uncaptured authorizations expire automatically
});
```

**What this does:**
- `capture_method: 'manual'` authorizes the card but doesn't charge it yet
- Funds are "held" on customer's card for up to 7 days
- You must capture within 7 days or the authorization expires (auto-refund)

---

### 2. **Save Payment Record After Authorization**

Create new endpoint `/app/api/payment/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      paymentIntentId,
      poolItemId,
      amount,
      currency,
      method = 'CARD',
    } = body;

    // Save payment record with AUTHORIZED status
    const payment = await prisma.payment.create({
      data: {
        poolItemId,
        method,
        amount,
        currency,
        status: 'AUTHORIZED', // ⭐ New status needed
        reference: paymentIntentId,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
```

---

### 3. **Update Database Schema**

Add new payment statuses to `prisma/schema.prisma`:

```prisma
enum PayStatus {
  PENDING
  AUTHORIZED    // ⭐ New: Funds held but not captured
  CAPTURED      // ⭐ New: Funds actually charged
  FAILED
  REFUNDED
  EXPIRED       // ⭐ New: Authorization expired (7 days passed)
}
```

Run migration:
```bash
npx prisma migrate dev --name add-escrow-payment-statuses
```

---

### 4. **Capture Payment When Pool Reaches MOQ**

Create `/app/api/pools/capture-payments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover' as any,
});

export async function POST(request: NextRequest) {
  try {
    const { poolId } = await request.json();

    // Check if pool reached MOQ
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        items: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Verify pool reached MOQ
    if (pool.pledgedQty < pool.targetQty) {
      return NextResponse.json(
        { error: 'Pool has not reached MOQ yet' },
        { status: 400 }
      );
    }

    // Capture all authorized payments
    const captureResults = [];
    for (const item of pool.items) {
      const payment = item.payment;
      
      if (!payment || payment.status !== 'AUTHORIZED') {
        continue;
      }

      try {
        // Capture the payment intent
        const paymentIntent = await stripe.paymentIntents.capture(
          payment.reference!
        );

        // Update payment status in database
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            paidAt: new Date(),
          },
        });

        captureResults.push({
          paymentId: payment.id,
          success: true,
        });
      } catch (error: any) {
        console.error(`Failed to capture payment ${payment.id}:`, error);
        
        // Update payment status to FAILED
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        captureResults.push({
          paymentId: payment.id,
          success: false,
          error: error.message,
        });
      }
    }

    // Update pool status to ACTIVE (order placed with supplier)
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        status: 'ACTIVE',
        moqReachedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      captureResults,
    });
  } catch (error: any) {
    console.error('Capture payments error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### 5. **Cancel/Refund Payments When Pool Fails**

Create `/app/api/pools/refund-payments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover' as any,
});

export async function POST(request: NextRequest) {
  try {
    const { poolId, reason = 'Pool did not reach MOQ' } = await request.json();

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        items: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    const refundResults = [];
    for (const item of pool.items) {
      const payment = item.payment;
      
      if (!payment || payment.status !== 'AUTHORIZED') {
        continue;
      }

      try {
        // Cancel the payment intent (releases the hold)
        const paymentIntent = await stripe.paymentIntents.cancel(
          payment.reference!
        );

        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
          },
        });

        refundResults.push({
          paymentId: payment.id,
          success: true,
        });
      } catch (error: any) {
        console.error(`Failed to cancel payment ${payment.id}:`, error);
        refundResults.push({
          paymentId: payment.id,
          success: false,
          error: error.message,
        });
      }
    }

    // Update pool status to CANCELLED
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        status: 'CANCELLED',
      },
    });

    return NextResponse.json({
      success: true,
      refundResults,
    });
  } catch (error: any) {
    console.error('Refund payments error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### 6. **Automated Pool Monitoring (Cron Job)**

Create `/app/api/cron/check-pools/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find pools that reached their deadline
    const expiredPools = await prisma.pool.findMany({
      where: {
        status: 'OPEN',
        deadline: {
          lte: now,
        },
      },
      include: {
        items: {
          include: {
            payment: true,
          },
        },
      },
    });

    const results = [];
    for (const pool of expiredPools) {
      // Check if MOQ was reached
      if (pool.pledgedQty >= pool.targetQty) {
        // Capture payments
        const captureResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/pools/capture-payments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poolId: pool.id }),
          }
        );
        
        results.push({
          poolId: pool.id,
          action: 'captured',
          success: captureResponse.ok,
        });
      } else {
        // Refund payments
        const refundResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/pools/refund-payments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poolId: pool.id }),
          }
        );
        
        results.push({
          poolId: pool.id,
          action: 'refunded',
          success: refundResponse.ok,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: expiredPools.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron check pools error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Set up Vercel Cron (vercel.json):**

```json
{
  "crons": [
    {
      "path": "/api/cron/check-pools",
      "schedule": "0 * * * *"
    }
  ]
}
```

Add to `.env`:
```bash
CRON_SECRET=your-secure-random-string
```

---

### 7. **Update Pool Schema**

Add tracking fields to `prisma/schema.prisma`:

```prisma
model Pool {
  id            String     @id @default(cuid())
  product       Product    @relation(fields: [productId], references: [id])
  productId     String     @unique
  targetQty     Int
  pledgedQty    Int        @default(0)
  status        PoolStatus @default(OPEN)
  deadline      DateTime
  moqReachedAt  DateTime?  // ⭐ New: When MOQ was reached
  // ... other fields
}

enum PoolStatus {
  OPEN
  ACTIVE      // MOQ reached, payments captured
  CANCELLED   // Failed to reach MOQ, payments refunded
  COMPLETED   // Orders delivered
}
```

---

## Important Considerations

### Stripe Authorization Limits
- **Card authorizations expire after 7 days**
- If your pool deadline is longer than 7 days, you'll need to either:
  1. Set shorter pool deadlines (recommended)
  2. Use "authorized but not captured" approach with re-authorization
  3. Consider collecting funds into your Stripe balance using `transfer_group`

### Alternative: Stripe Connect (True Escrow)
For longer holding periods or true escrow:

```typescript
// Create platform account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: 'supplier@example.com',
  capabilities: {
    transfers: { requested: true },
  },
});

// Hold funds in your balance, transfer later
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  transfer_group: `pool_${poolId}`,
});

// Transfer when pool succeeds
const transfer = await stripe.transfers.create({
  amount: 1000,
  currency: 'usd',
  destination: account.id,
  transfer_group: `pool_${poolId}`,
});
```

---

## Testing

### Test the Flow

1. **Create payment intent with manual capture:**
```bash
curl -X POST http://localhost:3000/api/payment/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "currency": "USD",
    "quantity": 5,
    "poolId": "pool_123",
    "email": "test@example.com"
  }'
```

2. **Test capture (when MOQ reached):**
```bash
curl -X POST http://localhost:3000/api/pools/capture-payments \
  -H "Content-Type: application/json" \
  -d '{"poolId": "pool_123"}'
```

3. **Test refund (when pool fails):**
```bash
curl -X POST http://localhost:3000/api/pools/refund-payments \
  -H "Content-Type: application/json" \
  -d '{"poolId": "pool_123"}'
```

---

## Summary

**Key Changes Needed:**
1. ✅ Add `capture_method: 'manual'` to payment intent creation
2. ✅ Add AUTHORIZED, CAPTURED, EXPIRED statuses to PayStatus enum
3. ✅ Create capture-payments endpoint
4. ✅ Create refund-payments endpoint
5. ✅ Set up cron job to check pool deadlines
6. ✅ Update pool schema with moqReachedAt field

**Benefits:**
- Funds are held (authorized) but not charged until MOQ reached
- Automatic refunds if pool fails
- Customer sees pending charge on card
- You have 7 days to capture before expiration
- Full Stripe fraud protection

**Next Steps:**
1. Update the payment intent creation code
2. Run database migrations
3. Create the new API endpoints
4. Set up the cron job
5. Test the complete flow
