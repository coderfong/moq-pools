import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";
import TrustBadges from "@/components/TrustBadges";
import OrderSummary from "@/components/OrderSummary";
import { formatCurrencyStable } from "@/lib/format";

export const metadata = {
  title: "Checkout | MOQ Pools",
  description: "Join the pool and pay safely with escrow. Your charge captures only when MOQ is met.",
};

// Use stable currency formatting to ensure SSR/CSR consistency
const formatCurrency = (n?: number | null, currency: string = 'USD') => formatCurrencyStable(n ?? null, currency);

export default async function CheckoutPage({ searchParams }: { searchParams: { poolId?: string; listingId?: string } }) {
  const poolId = (searchParams.poolId || '').trim();
  const listingId = (searchParams.listingId || '').trim();
  
  let pool: any = null;
  let listing: any = null;
  
  // Try to load from poolId first
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
  
  // If no pool but we have a listingId, load the listing directly
  if (!pool && listingId && prisma) {
    try {
      listing = await prisma.savedListing.findUnique({
        where: { id: listingId },
      });
    } catch {}
  }

  // Extract data from pool if available
  const title = pool?.product?.title || listing?.title || 'Selected product';
  const currency = pool?.product?.baseCurrency || listing?.currency || 'USD';
  const unitPrice: number | null = pool?.product?.unitPrice 
    ? Number(pool.product.unitPrice) 
    : (listing?.priceMin ? Number(listing.priceMin) : null);
  const moq = pool?.product?.moqQty || null;
  const sourceUrl: string | null = pool?.product?.sourceUrl || listing?.url || null;
  const supplierName: string | undefined = pool?.product?.supplier?.name;

  // Get product image and additional details from SavedListing if needed
  const { img, actualTitle, actualMoq, actualPrice, actualSupplier } = await (async () => {
    const js = pool?.product?.imagesJson;
    let imgFromJson: string | null = null;
    if (js) {
      try { 
        const arr = JSON.parse(js); 
        imgFromJson = Array.isArray(arr) && arr[0] ? String(arr[0]) : null; 
      } catch {}
    }
    
    // Default values from Product table
    const defaults = {
      img: imgFromJson,
      actualTitle: title,
      actualMoq: moq,
      actualPrice: unitPrice,
      actualSupplier: supplierName,
    };
    
    // Try to get enhanced details from SavedListing
    if (sourceUrl && prisma) {
      try {
        const listing = await prisma.savedListing.findUnique({
          where: { url: sourceUrl },
          select: { 
            image: true,
            title: true,
            priceRaw: true,
          }
        });
        
        if (listing) {
          // Use cached image if available and better than product image
          const finalImg = (listing.image && /^\/cache\//i.test(listing.image)) 
            ? listing.image 
            : imgFromJson;
          
          return {
            img: finalImg,
            actualTitle: listing.title || title,
            actualMoq: moq,
            actualPrice: unitPrice,
            actualSupplier: supplierName,
          };
        }
      } catch {}
    }
    
    // Return Product table data if SavedListing not found or query failed
    return defaults;
  })();

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
                {img ? <img src={img} alt={actualTitle} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-neutral-900">{actualTitle}</div>
                <div className="mt-1 text-sm text-neutral-700">Supplier: {actualSupplier || '—'}</div>
                <div className="mt-1 text-sm text-neutral-700">MOQ: {actualMoq ? `≥${actualMoq}` : 'Varies'}</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Price: {actualPrice ? formatCurrency(actualPrice, currency) : (actualPrice === null ? 'Contact supplier' : formatCurrency(0, currency))} <span className="text-neutral-500">/ unit</span>
                </div>

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
            <OrderSummary unitPrice={actualPrice} currency={currency} paymentEnabled={false} />
          </div>
        </div>
      )}
    </div>
  );
}
