import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";

export const metadata = {
  title: "Checkout | MOQ Pools",
  description: "Join the pool and pay safely with escrow. Your charge captures only when MOQ is met.",
};

function formatCurrency(n?: number | null) {
  if (!Number.isFinite(Number(n))) return "—";
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n)); } catch { return `$${Number(n).toFixed(2)}`; }
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
  const price = pool?.product?.price || null;
  const moq = pool?.product?.moqQty || null;

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
                <div className="mt-1 text-sm text-neutral-700">Supplier: {pool?.product?.supplier?.name || '—'}</div>
                <div className="mt-1 text-sm text-neutral-700">MOQ: {moq ? `≥${moq}` : 'Varies'}</div>
                <div className="mt-1 text-sm text-neutral-700">Price: {formatCurrency(price)} <span className="text-neutral-500">/ unit</span></div>
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
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
              <div className="font-medium text-neutral-900">Order Summary</div>
              <div className="mt-2 text-sm text-neutral-700">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(price)}</span></div>
                <div className="flex items-center justify-between"><span>Escrow</span><span>Included</span></div>
                <div className="flex items-center justify-between"><span>Estimated total</span><span>{formatCurrency(price)}</span></div>
              </div>
              <button disabled className="mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white opacity-70">Proceed to Payment</button>
              <div className="mt-2 text-xs text-neutral-500">Payment opens when the pool reaches MOQ.</div>
              <div className="mt-3 flex items-center gap-3">
                <Image src={stripeLogo} alt="Stripe" width={60} height={24} className="h-6 w-auto" />
                <Image src={paypalLogo} alt="PayPal" width={60} height={24} className="h-6 w-auto" />
              </div>
              <div className="mt-3 text-xs text-neutral-600">
                <Link href="/information/payment-protection" className="underline">Payment Protection</Link>
                <span> · </span>
                <Link href="/how-it-works" className="underline">How it works</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
