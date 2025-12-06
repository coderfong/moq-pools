import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";
import TrustBadges from "@/components/TrustBadges";
import OrderSummary from "@/components/OrderSummary";
import CheckoutForm from "@/components/CheckoutForm";
import CheckoutSteps from "@/components/CheckoutSteps";
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
  // Try to get the best title: detailJson.title > pool title > listing title
  const title = pool?.product?.title || detailData?.title || listing?.title || 'Selected product';
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
        actualTitle: detailData?.title || listing.title || title,
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
    <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">Checkout</h1>
      <div className="mt-2 text-base text-gray-700">Pay safely with escrow. We only capture payment once MOQ is met.</div>

      {/* Progress Steps */}
      {(poolId || listingId) && (
        <div className="mt-8">
          <CheckoutSteps currentStep={2} />
        </div>
      )}

      {!poolId && !listingId && (
        <div className="mt-6 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-base text-neutral-700 shadow-md">
          No pool selected. Go to <Link href="/products" className="underline hover:text-orange-600 font-medium">Products</Link> and click <span className="font-semibold text-orange-600">Join Pool</span>.
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
