import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";
import TrustBadges from "@/components/TrustBadges";
import OrderSummary from "@/components/OrderSummary";
import CheckoutForm from "@/components/CheckoutForm";
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

  // Parse enhanced details from listing.detailJson if available
  let detailData: any = null;
  if (listing?.detailJson) {
    try {
      detailData = typeof listing.detailJson === 'string' 
        ? JSON.parse(listing.detailJson) 
        : listing.detailJson;
    } catch {}
  }

  // Helper to extract first number from price text
  const extractPriceNumber = (priceText?: string | null): number | null => {
    if (!priceText) return null;
    const match = String(priceText).match(/[\d,]+\.?\d*/);
    if (!match) return null;
    const num = parseFloat(match[0].replace(/,/g, ''));
    return isNaN(num) ? null : num;
  };

  // Extract data from pool or listing
  const title = pool?.product?.title || listing?.title || 'Selected product';
  const currency = pool?.product?.baseCurrency || listing?.currency || detailData?.currency || 'USD';
  
  // Try to get price in order: pool unitPrice, listing priceMin, detailJson priceMin, parse from priceText
  let unitPrice: number | null = null;
  if (pool?.product?.unitPrice) {
    unitPrice = Number(pool.product.unitPrice);
  } else if (listing?.priceMin) {
    unitPrice = Number(listing.priceMin);
  } else if (detailData?.priceMin) {
    unitPrice = Number(detailData.priceMin);
  } else if (detailData?.priceText) {
    unitPrice = extractPriceNumber(detailData.priceText);
  } else if (listing?.priceRaw) {
    unitPrice = extractPriceNumber(listing.priceRaw);
  }
  
  const moq = pool?.product?.moqQty || listing?.moq || (detailData?.moq ? Number(detailData.moq) : null);
  const sourceUrl: string | null = pool?.product?.sourceUrl || listing?.url || null;
  const supplierName: string | undefined = pool?.product?.supplier?.name || listing?.storeName || detailData?.supplier?.name || undefined;

  // Get product image and additional details from SavedListing if needed
  const { img, actualTitle, actualMoq, actualPrice, actualSupplier } = await (async () => {
    // If we have a listing directly, use it
    if (listing) {
      return {
        img: listing.image || null,
        actualTitle: listing.title || title,
        actualMoq: moq,
        actualPrice: listing.priceMin ? Number(listing.priceMin) : unitPrice,
        actualSupplier: supplierName,
      };
    }
    
    // Otherwise use pool product data
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
    
    // Try to get enhanced details from SavedListing if we have a sourceUrl
    if (sourceUrl && prisma) {
      try {
        const savedListing = await prisma.savedListing.findUnique({
          where: { url: sourceUrl },
          select: { 
            image: true,
            title: true,
            priceRaw: true,
            priceMin: true,
          }
        });
        
        if (savedListing) {
          // Use cached image if available and better than product image
          const finalImg = (savedListing.image && /^\/cache\//i.test(savedListing.image)) 
            ? savedListing.image 
            : imgFromJson;
          
          return {
            img: finalImg,
            actualTitle: savedListing.title || title,
            actualMoq: moq,
            actualPrice: savedListing.priceMin ? Number(savedListing.priceMin) : unitPrice,
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

      {!poolId && !listingId && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          No pool selected. Go to <Link href="/products" className="underline">Products</Link> and click <span className="font-medium">Join Pool</span>.
        </div>
      )}

      {(poolId || listingId) && (
        <CheckoutForm
          img={img}
          actualTitle={actualTitle}
          actualSupplier={actualSupplier}
          actualMoq={actualMoq}
          actualPrice={actualPrice}
          currency={currency}
          sourceUrl={sourceUrl}
        />
      )}
    </div>
  );
}
