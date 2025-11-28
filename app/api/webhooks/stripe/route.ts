import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const config = { api: { bodyParser: false } } as any;

export async function POST(req: NextRequest) {
  const buf = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-09-30.clover' as any });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err:any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    if (!prisma) {
      // Accept the webhook but indicate DB is unavailable; Stripe will retry.
      return NextResponse.json({ received: true, db: 'unavailable' }, { status: 202 });
    }
    const session = event.data.object as Stripe.Checkout.Session;
    const poolItemId = session.metadata?.pool_item_id as string | undefined;
    const poolId = session.metadata?.pool_id as string | undefined;

    if (poolItemId) {
      await prisma.payment.updateMany({
        where: { poolItemId },
        data: { status: 'PAID', paidAt: new Date(), reference: session.id }
      });
    }
    if (poolId) {
      const pool = await prisma.pool.findUnique({ where: { id: poolId }});
      if (pool && pool.pledgedQty >= pool.targetQty && pool.status === 'OPEN') {
        await prisma.pool.update({ where: { id: pool.id }, data: { status: 'LOCKED' }});
      }
    }
  }

  return NextResponse.json({ received: true });
}
