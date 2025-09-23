import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const { poolId, quantity, email, address } = await req.json();
  const pool = await prisma.pool.findUnique({ where: { id: poolId }, include: { product: true }});
  if (!pool || pool.status !== 'OPEN') return NextResponse.json({ error: 'Pool not open' }, { status: 400 });

  const user = await prisma.user.upsert({ where: { email }, update: { email }, create: { email, name: email.split('@')[0] } });
  const addr = await prisma.address.create({ data: { userId: user.id, line1: address.line1, city: address.city, postal: address.postal, country: address.country }});

  const remaining = Math.max(0, pool.targetQty - pool.pledgedQty);
  const finalQty = Math.min(Number(quantity)||1, remaining > 0 ? remaining : Number(quantity)||1);

  const item = await prisma.poolItem.create({
    data: { poolId: pool.id, userId: user.id, quantity: finalQty, unitPrice: pool.product.unitPrice, currency: pool.product.baseCurrency, addressId: addr.id }
  });

  const amount = Number(pool.product.unitPrice) * finalQty;
  await prisma.payment.create({
    data: { poolItemId: item.id, method: 'STRIPE', amount, currency: pool.product.baseCurrency, status: 'REQUIRES_ACTION' }
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: pool.product.baseCurrency.toLowerCase(),
        product_data: { name: `${pool.product.title} (Group Buy)` },
        unit_amount: Math.round(Number(pool.product.unitPrice) * 100)
      },
      quantity: finalQty
    }],
    metadata: { pool_item_id: item.id, pool_id: pool.id },
    success_url: `${process.env.APP_BASE_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_BASE_URL}/p/${pool.productId}?cancelled=1`
  });

  await prisma.pool.update({ where: { id: pool.id }, data: { pledgedQty: { increment: finalQty }}});
  return NextResponse.json({ url: session.url });
}
