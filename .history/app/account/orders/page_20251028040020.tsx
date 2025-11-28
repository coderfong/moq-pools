import React from "react";
import Link from "next/link";

export const metadata = { title: "Orders - Account - MOQ Pools" };

export default function OrdersPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const tab = String(searchParams?.tab || 'all').toLowerCase();
  const active = (t: string) => tab === t ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200';
  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-6 text-neutral-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/account/orders/tracking" className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Go to Tracking</Link>
      </div>
      <nav className="mt-4 flex flex-wrap items-center gap-2">
        <Link href="/account/orders?tab=awaiting-payment" className={`rounded-full px-3 py-1.5 text-sm ${active('awaiting-payment')}`}>Awaiting payment</Link>
        <Link href="/account/orders?tab=processing" className={`rounded-full px-3 py-1.5 text-sm ${active('processing')}`}>Processing</Link>
        <Link href="/account/orders?tab=shipped" className={`rounded-full px-3 py-1.5 text-sm ${active('shipped')}`}>Shipped</Link>
        <Link href="/account/orders?tab=completed" className={`rounded-full px-3 py-1.5 text-sm ${active('completed')}`}>Completed</Link>
        <Link href="/account/orders?tab=all" className={`rounded-full px-3 py-1.5 text-sm ${active('all')}`}>All</Link>
      </nav>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-700">Showing <span className="font-medium">{tab.replace('-', ' ')}</span> orders.</div>
        <div className="mt-2 text-xs text-neutral-500">This is a placeholder view. Your detailed order list can be wired here.</div>
      </div>
    </section>
  );
}
