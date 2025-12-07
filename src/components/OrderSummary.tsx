"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import stripeLogo from "../../company logos/stripe.png";
import TrustBadges from "./TrustBadges";
import { formatCurrencyStable } from "@/lib/format";
import { calculateShippingCost } from "@/lib/shipping";

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
  const [shippingZone, setShippingZone] = React.useState<'domestic' | 'canada' | 'international'>('domestic');
  const [estimatedWeight, setEstimatedWeight] = React.useState(1);
  const disabled = !paymentEnabled || !agreed || processing;
  
  // Calculate total based on quantity
  const subtotal = unitPrice ? unitPrice * quantity : null;
  
  // Calculate shipping cost based on quantity and zone
  const shippingResult = React.useMemo(() => {
    if (!subtotal) return { cost: 0, zone: 'domestic' as const };
    
    // Estimate weight based on quantity (1 lb per unit as default)
    const totalWeight = quantity * estimatedWeight;
    
    return calculateShippingCost({
      quantity,
      weight: totalWeight,
      dimensions: { length: 12, width: 8, height: 6 }, // Default dimensions
      zone: shippingZone,
      productTitle
    });
  }, [quantity, estimatedWeight, shippingZone, subtotal, productTitle]);
  
  const shippingCost = shippingResult.cost;
  const finalTotal = subtotal ? subtotal + shippingCost : null;
  
  const handlePayment = async () => {
    if (disabled || !finalTotal) return;
    
    setProcessing(true);
    try {
      const listingId = searchParams.get('listingId') || '';
      const poolId = searchParams.get('poolId') || '';
      
      // Redirect to payment page with order details including shipping
      const params = new URLSearchParams({
        amount: finalTotal.toString(),
        subtotal: subtotal?.toString() || '0',
        shipping: shippingCost.toString(),
        shippingZone,
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
    <div className="group overflow-hidden rounded-xl sm:rounded-2xl border-2 border-orange-300/50 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-3 sm:p-4 lg:p-6 shadow-xl hover:shadow-2xl hover:border-orange-400/60 transition-all duration-500 backdrop-blur-sm lg:sticky lg:top-6">
      {/* Card glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 via-amber-400/0 to-yellow-400/0 group-hover:from-orange-400/5 group-hover:via-amber-400/5 group-hover:to-yellow-400/5 transition-all duration-500 rounded-2xl pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 lg:mb-6">
          <svg className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-orange-600 animate-pulse-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="font-extrabold text-base sm:text-lg lg:text-xl bg-gradient-to-r from-gray-900 via-orange-700 to-amber-600 bg-clip-text text-transparent">
            Order Summary
          </h3>
        </div>
      
      {/* Product Image - only show when showImage is true */}
      {showImage && productImage && (
        <div className="mb-4 sm:mb-6 w-full aspect-square overflow-hidden rounded-lg sm:rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100 shadow-lg hover:scale-105 transition-transform duration-300">
          <img src={productImage} alt={productTitle} className="h-full w-full object-cover" />
        </div>
      )}
      
      <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-sm">
        <div className="group/item flex items-center justify-between p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-orange-100 hover:border-orange-200 hover:shadow-md">
          <span className="flex items-center gap-2 text-neutral-700 font-medium text-xs sm:text-sm">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600 group-hover/item:scale-110 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="truncate">Subtotal</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold whitespace-nowrap">
              {quantity} {quantity === 1 ? 'unit' : 'units'}
            </span>
          </span>
          <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent whitespace-nowrap ml-2">
            {formatCurrencyStable(subtotal ?? null, currency)}
          </span>
        </div>
        
        <div className="group/item flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-all duration-200">
          <span className="flex items-center gap-2 text-green-800 font-medium text-xs sm:text-sm">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 group-hover/item:scale-110 group-hover/item:rotate-12 transition-all duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="truncate">Escrow Protection</span>
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="font-semibold text-green-700 text-xs sm:text-sm whitespace-nowrap">Included</span>
            <svg className="w-3 sm:w-4 h-3 sm:h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Shipping Zone Selector */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-white/50 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-neutral-700 font-medium text-xs sm:text-sm">Shipping Zone</span>
          </div>
          <select 
            value={shippingZone} 
            onChange={(e) => setShippingZone(e.target.value as any)}
            className="w-full text-xs sm:text-sm rounded-lg border border-orange-200 bg-white px-2 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          >
            <option value="domestic">🇺🇸 Domestic US (5-7 days)</option>
            <option value="canada">🇨🇦 Canada (7-10 days)</option>
            <option value="international">🌍 International (10-21 days)</option>
          </select>
        </div>
        
        {/* Shipping Cost */}
        <div className="group/item flex items-center justify-between p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-orange-100 hover:border-orange-200 hover:shadow-md">
          <span className="flex items-center gap-2 text-neutral-700 font-medium text-xs sm:text-sm">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600 group-hover/item:scale-110 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="truncate">Shipping ({shippingResult.category})</span>
          </span>
          <span className="font-bold text-sm sm:text-base text-neutral-900 whitespace-nowrap ml-2">
            {formatCurrencyStable(shippingCost, currency)}
          </span>
        </div>
        
        <div className="pt-2 sm:pt-3 lg:pt-4 border-t-2 border-orange-200/50">
          <div className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 shadow-lg">
            <span className="flex items-center gap-2 text-neutral-900 font-bold text-sm sm:text-base">
              <svg className="w-5 sm:w-6 h-5 sm:h-6 text-orange-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-neutral-900">Total</span>
            </span>
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-orange-600 whitespace-nowrap ml-2">
              {formatCurrencyStable(finalTotal ?? null, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 flex items-start gap-2 sm:gap-3 text-xs text-neutral-700 bg-gradient-to-r from-orange-50/80 to-amber-50/80 p-3 sm:p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-all duration-200">
        <input 
          id="consent" 
          type="checkbox" 
          className="mt-0.5 h-4 sm:h-5 w-4 sm:w-5 rounded-md border-2 border-orange-400 text-orange-600 focus:ring-orange-500 focus:ring-2 cursor-pointer transition-all duration-200 hover:scale-110 shrink-0" 
          checked={agreed} 
          onChange={(e) => setAgreed(e.target.checked)} 
        />
        <label htmlFor="consent" className="select-none cursor-pointer leading-relaxed text-xs sm:text-sm">
          I have read and agree to the{' '}
          <Link href="/terms" className="font-bold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/refund-policy" className="font-bold text-orange-600 underline decoration-2 hover:text-orange-700 transition-colors duration-200">
            Refund Policy
          </Link>.
        </label>
      </div>

      <button 
        disabled={disabled} 
        onClick={handlePayment}
        className={`mt-3 sm:mt-4 lg:mt-6 w-full rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-extrabold text-white shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 relative overflow-hidden group/btn ${disabled ? 'opacity-60 cursor-not-allowed hover:scale-100 hover:shadow-xl' : 'cursor-pointer hover:scale-105 animate-pulse-subtle'}`}
      >
        {/* Button shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 pointer-events-none" />
        
        {processing ? (
          <span className="relative flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 sm:h-5 w-4 sm:w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm sm:text-base">Processing...</span>
          </span>
        ) : (
          <span className="relative flex items-center justify-center gap-2">
            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm sm:text-base">Proceed to Secure Payment</span>
            <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover/btn:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        )}
      </button>
      
      <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 text-xs text-neutral-600 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-blue-200 shadow-sm">
        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 animate-pulse-subtle shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-xs sm:text-sm text-center">Payment opens when the pool reaches MOQ</span>
      </div>
      
      <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-xl border-2 border-purple-200 shadow-md hover:shadow-lg transition-all duration-200 group/stripe">
        <span className="text-xs font-bold text-neutral-700 hidden sm:inline">Secured & Powered by</span>
        <span className="text-xs font-bold text-neutral-700 sm:hidden">Secured by</span>
        <Image 
          src={stripeLogo} 
          alt="Stripe" 
          width={70} 
          height={28} 
          className="h-6 sm:h-8 w-auto opacity-80 group-hover/stripe:opacity-100 transition-opacity duration-200" 
        />
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse animation-delay-200" />
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse animation-delay-400" />
        </div>
      </div>
      
      <div className="mt-4 sm:mt-5 transform hover:scale-105 transition-transform duration-200">
        <TrustBadges size="sm" />
      </div>
      
      <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-neutral-600">
        <Link href="/information/payment-protection" className="w-full sm:w-auto font-bold text-orange-600 hover:text-orange-700 transition-colors duration-200 flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 hover:shadow-md">
          <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-xs sm:text-sm">Payment Protection</span>
        </Link>
        <Link href="/how-it-works" className="w-full sm:w-auto font-bold text-orange-600 hover:text-orange-700 transition-colors duration-200 flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 hover:shadow-md">
          <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs sm:text-sm">How it works</span>
        </Link>
      </div>
      </div>
    </div>
  );
}
