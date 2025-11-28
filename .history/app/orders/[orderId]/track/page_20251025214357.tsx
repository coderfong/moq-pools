import React from 'react';
import { getSession } from '../../../api/_lib/session';
import { getPrisma } from '@/lib/prisma';
import OrderTrackingClient from '../../../account/orders/tracking/ui/OrderTrackingClient';

export const dynamic = 'force-dynamic';

export default async function OrderTrackPage({ params }: { params: { orderId: string } }) {
  const session = getSession();
  if (!session) {
    return (
      <section className="min-h-screen w-full bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold flex items-center gap-3">🚚 Order Tracking</h1>
          <p className="mt-2 text-sm text-neutral-600">Please sign in to view your shipment.</p>
        </div>
      </section>
    );
  }

  let shipments: any[] = [];
  let hasDb = true;
  const orderIdRaw = params.orderId || '';
  const poolItemId = orderIdRaw.replace(/^ord[_-]/i, '');

  try {
    const prisma: any = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true } });
    if (me) {
      // Ensure the order belongs to this user before returning any data
      const owns = await prisma.poolItem.findUnique({ where: { id: poolItemId }, select: { id: true, userId: true } });
      if (!owns || owns.userId !== me.id) {
        return (
          <section className="min-h-screen w-full bg-neutral-50">
            <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-2xl font-semibold flex items-center gap-3">🚚 Order Tracking</h1>
              <p className="mt-2 text-sm text-neutral-600">Order not found.</p>
            </div>
          </section>
        );
      }
      shipments = await prisma.shipment.findMany({
        where: { poolItemId: poolItemId },
        include: {
          poolItem: {
            select: {
              id: true,
              quantity: true,
              createdAt: true,
              address: { select: { id: true, line1: true, line2: true, city: true, state: true, postal: true, country: true, phone: true } },
              payment: { select: { id: true, method: true, status: true, amount: true, currency: true, paidAt: true, reference: true } },
              pool: {
                select: {
                  id: true,
                  product: { select: { id: true, title: true, imagesJson: true, supplier: { select: { id: true, name: true } } } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
    }
  } catch (e: any) {
    hasDb = false;
  }

  return (
    <section className="min-h-screen w-full bg-neutral-50">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3">🚚 Order Tracking</h1>
        </div>
        {!hasDb ? (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            Database is not configured in this environment. Showing no tracking events.
          </div>
        ) : (
          <OrderTrackingClient shipments={shipments as any} />
        )}
      </div>
    </section>
  );
}
