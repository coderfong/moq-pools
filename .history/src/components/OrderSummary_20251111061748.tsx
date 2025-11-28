"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import stripeLogo from "../../company logos/stripe.png";
import TrustBadges from "./TrustBadges";
import { formatCurrencyStable } from "@/lib/format";

export default function OrderSummary({ 
  unitPrice, 
  quantity = 1,
  currency, 
  paymentEnabled = false,
  productTitle = 'Product',
  productImage = '',
  showImage = false,
}: { 
  unitPrice: number | null; 
  quantity?: number;
  currency: string; 
  paymentEnabled?: boolean;
  productTitle?: string;
  productImage?: string;
  showImage?: boolean;
}) {
  const searchParams = useSearchParams();
  const [agreed, setAgreed] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const disabled = !paymentEnabled || !agreed || processing;
  
  // Calculate total based on quantity
  const subtotal = unitPrice ? unitPrice * quantity : null;
  
  const handlePayment = async () => {
    if (disabled || !subtotal) return;
    
    setProcessing(true);
    try {
      const listingId = searchParams.get('listingId') || '';
      const poolId = searchParams.get('poolId') || '';
      
      // Redirect to payment page with order details
      const params = new URLSearchParams({
        amount: subtotal.toString(),
        currency,
        quantity: quantity.toString(),
        title: encodeURIComponent(productTitle),
      });
      
      if (listingId) params.set('listingId', listingId);
      if (poolId) params.set('poolId', poolId);
      if (productImage) params.set('img', productImage);
      
      window.location.href = `/payment?${params.toString()}`;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to proceed to payment. Please try again.');
      setProcessing(false);
    }
  };
  
  return (
    <div className="group overflow-hidden rounded-2xl border-2 border-orange-300/50 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-6 shadow-xl hover:shadow-2xl hover:border-orange-400/60 transition-all duration-500 backdrop-blur-sm sticky top-6">
      {/* Card glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 via-amber-400/0 to-yellow-400/0 group-hover:from-orange-400/5 group-hover:via-amber-400/5 group-hover:to-yellow-400/5 transition-all duration-500 rounded-2xl" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-6 h-6 text-orange-600 animate-pulse-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="font-extrabold text-xl bg-gradient-to-r from-gray-900 via-orange-700 to-amber-600 bg-clip-text text-transparent">
            Order Summary
          </h3>
        </div>
      
      {/* Product Image - only show when showImage is true */}
      {showImage && productImage && (
        <div className="mb-6 w-full aspect-square overflow-hidden rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100 shadow-lg hover:scale-105 transition-transform duration-300">
          <img src={productImage} alt={productTitle} className="h-full w-full object-cover" />
        </div>
      )}
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-neutral-800 font-medium">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Subtotal ({quantity} {quantity === 1 ? 'unit' : 'units'})
          </span>
          <span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {formatCurrencyStable(subtotal ?? null, currency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-neutral-700">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Escrow Protection
          </span>
          <span className="font-semibold text-green-600">Included</span>
        </div>
        
        <div className="pt-3 border-t-2 border-orange-200/50 flex items-center justify-between text-neutral-900 font-bold text-base">
          <span>Estimated Total</span>
          <span className="text-xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {formatCurrencyStable(subtotal ?? null, currency)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 text-xs text-neutral-700 bg-orange-50/50 p-3 rounded-xl border border-orange-200">
        <input 
          id="consent" 
          type="checkbox" 
          className="mt-0.5 h-4 w-4 rounded border-orange-400 text-orange-600 focus:ring-orange-500 focus:ring-2 cursor-pointer transition-all duration-200" 
          checked={agreed} 
          onChange={(e) => setAgreed(e.target.checked)} 
        />
        <label htmlFor="consent" className="select-none cursor-pointer">
          I have read and agree to the{' '}
          <Link href="/terms" className="font-semibold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/refund-policy" className="font-semibold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200">
            Refund Policy
          </Link>.
        </label>
      </div>

      <button 
        disabled={disabled} 
        onClick={handlePayment}
        className={`mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-6 py-4 text-base font-bold text-white shadow-xl hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300 ${disabled ? 'opacity-60 cursor-not-allowed hover:scale-100 hover:shadow-xl' : 'cursor-pointer animate-pulse-subtle'}`}
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Proceed to Payment
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        )}
      </button>
      
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-600 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-200">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Payment opens when the pool reaches MOQ</span>
      </div>
      
      <div className="mt-5 flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <span className="text-xs font-semibold text-neutral-700">Secured by</span>
        <Image src={stripeLogo} alt="Stripe" width={70} height={28} className="h-7 w-auto opacity-80 hover:opacity-100 transition-opacity duration-200" />
      </div>
      
      <div className="mt-5">
        <TrustBadges size="sm" />
      </div>
      
      <div className="mt-5 flex items-center justify-center gap-3 text-xs text-neutral-600">
        <Link href="/information/payment-protection" className="font-semibold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Payment Protection
        </Link>
        <span className="text-neutral-400">·</span>
        <Link href="/how-it-works" className="font-semibold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How it works
        </Link>
      </div>
    </div>
  );
}
