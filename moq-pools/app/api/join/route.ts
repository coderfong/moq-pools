import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(req: NextRequest) {
  const { poolId, quantity, email, address, method } = await req.json();
  const pool = await prisma.pool.findUnique({ where: { id: poolId }, include: { product: true }});
  if (!pool || pool.status !== 'OPEN') return NextResponse.json({ error: 'Pool not open' }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { email },
    update: { email },
    create: { email, name: email.split('@')[0] }
  });
  const addr = await prisma.address.create({ data: { userId: user.id, line1: address.line1, city: address.city, postal: address.postal, country: address.country }});

  const remaining = Math.max(0, pool.targetQty - pool.pledgedQty);
  const finalQty = Math.min(Number(quantity)||1, remaining > 0 ? remaining : Number(quantity)||1);

  const item = await prisma.poolItem.create({
    data: {
      poolId: pool.id,
      userId: user.id,
      quantity: finalQty,
      unitPrice: pool.product.unitPrice,
      currency: pool.product.baseCurrency,
      addressId: addr.id
    }
  });

  const amount = Number(pool.product.unitPrice) * finalQty;
  await prisma.payment.create({
    data: {
      poolItemId: item.id,
      method,
      amount,
      currency: pool.product.baseCurrency,
      status: method === 'STRIPE' ? 'REQUIRES_ACTION' : 'PENDING'
    }
  });

  await prisma.pool.update({ where: { id: pool.id }, data: { pledgedQty: { increment: finalQty }}});

  return NextResponse.json({ ok: true, message: 'Joined. For Stripe, use /api/payments/stripe/checkout.' });
}
