import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";
import TrustBadges from "@/components/TrustBadges";
import OrderSummary from "@/components/OrderSummary";

export const metadata = {
  title: "Checkout | MOQ Pools",
  description: "Join the pool and pay safely with escrow. Your charge captures only when MOQ is met.",
};

function formatCurrency(n?: number | null, currency: string = 'USD') {
  if (!Number.isFinite(Number(n))) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(n));
  } catch {
    return `${currency === 'USD' ? '$' : ''}${Number(n).toFixed(2)}`;
  }
}

export default async function CheckoutPage({ searchParams }: { searchParams: { poolId?: string } }) {
  const poolId = (searchParams.poolId || '').trim();
  let pool: any = null;
  if (poolId) {
    try {
      if (prisma) {
        pool = await prisma.pool.findUnique({
          where: { id: poolId },
          include: { product: { include: { supplier: true } } },
        });
      }
    } catch {}
  }

  const title = pool?.product?.title || 'Selected product';
  const img = (() => {
    const js = pool?.product?.imagesJson;
    if (!js) return null;
    try { const arr = JSON.parse(js); return Array.isArray(arr) && arr[0] ? String(arr[0]) : null; } catch { return null; }
  })();
  const currency = pool?.product?.baseCurrency || 'USD';
  const unitPrice: number | null = pool?.product?.unitPrice ? Number(pool.product.unitPrice) : null;
  const moq = pool?.product?.moqQty || null;
  const sourceUrl: string | null = pool?.product?.sourceUrl || null;
  const supplierName: string | undefined = pool?.product?.supplier?.name;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Checkout</h1>
      <div className="mt-1 text-sm text-neutral-600">Pay safely with escrow. We only capture payment once MOQ is met.</div>

      {!poolId && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          No pool selected. Go to <Link href="/products" className="underline">Products</Link> and click <span className="font-medium">Join Pool</span>.
        </div>
      )}

      {poolId && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {img ? <img src={img} alt={title} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-neutral-900">{title}</div>
                <div className="mt-1 text-sm text-neutral-700">Supplier: {supplierName || '—'}</div>
                <div className="mt-1 text-sm text-neutral-700">MOQ: {moq ? `≥${moq}` : 'Varies'}</div>
                <div className="mt-1 text-sm text-neutral-700">Price: {formatCurrency(unitPrice, currency)} <span className="text-neutral-500">/ unit</span></div>

                {sourceUrl ? (
                  <div className="mt-2 text-xs">
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline">View original listing</a>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Quantity</label>
                <input className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900" defaultValue={1} min={1} type="number" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700">Notes (optional)</label>
                <input className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Color, size, etc." />
              </div>
            </div>

            <div className="mt-4 hidden text-sm text-neutral-500">Shipping and taxes are calculated at a later step.</div>
          </div>

          <div className="md:col-span-1 space-y-3">
            <OrderSummary unitPrice={unitPrice} currency={currency} paymentEnabled={false} />
          </div>
        </div>
      )}
    </div>
  );
}
