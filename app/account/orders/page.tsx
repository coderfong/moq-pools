import React from "react";
import Link from "next/link";
import { getSession } from '../../api/_lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EnhancedOrdersClient from "./EnhancedOrdersClient";

export const metadata = { title: "Orders - Account - MOQ Pools" };

export default async function OrdersPage({ 
  searchParams 
}: { 
  searchParams?: Record<string, string | string[] | undefined> 
}) {
  const session = getSession();
  if (!session?.sub || !prisma) redirect('/login?next=/account/orders');

  const tab = String(searchParams?.tab || 'all').toLowerCase();
  
  // Build status filter based on the correct PoolStatus enum
  let statusFilter: any = {};
  if (tab === 'awaiting-payment') statusFilter = { status: 'OPEN' };
  else if (tab === 'processing') statusFilter = { status: { in: ['LOCKED', 'ORDER_PLACED'] } };
  else if (tab === 'shipped') statusFilter = { status: 'FULFILLING' };
  else if (tab === 'completed') statusFilter = { status: 'FULFILLED' };

  // Fetch user's pool items with pool and listing details
  const poolItems = await prisma.poolItem.findMany({
    where: {
      userId: session.sub,
      ...(tab !== 'all' && { pool: statusFilter }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      pool: {
        select: {
          id: true,
          status: true,
          targetQty: true,
          pledgedQty: true,
          deadlineAt: true,
          product: {
            select: {
              id: true,
              title: true,
              imagesJson: true,
              unitPrice: true,
              baseCurrency: true,
              supplier: {
                select: {
                  name: true,
                },
              },
              sourcePlatform: true,
            },
          },
        },
      },
    },
  });

  const active = (t: string) => 
    tab === t 
      ? 'bg-orange-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-6 text-neutral-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link 
          href="/pools" 
          className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm hover:bg-orange-700 transition-colors"
        >
          Browse Products
        </Link>
      </div>
      
      <nav className="mt-4 flex flex-wrap items-center gap-2">
        <Link 
          href="/account/orders?tab=awaiting-payment" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('awaiting-payment')}`}
        >
          Awaiting payment
        </Link>
        <Link 
          href="/account/orders?tab=processing" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('processing')}`}
        >
          Processing
        </Link>
        <Link 
          href="/account/orders?tab=shipped" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('shipped')}`}
        >
          Shipped
        </Link>
        <Link 
          href="/account/orders?tab=completed" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('completed')}`}
        >
          Completed
        </Link>
        <Link 
          href="/account/orders?tab=all" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('all')}`}
        >
          All
        </Link>
      </nav>

      <div className="mt-6">
        <EnhancedOrdersClient orders={poolItems as any} activeTab={tab} />
      </div>
    </section>
  );
}
