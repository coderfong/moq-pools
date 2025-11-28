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
    <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-white to-orange-50/20 p-6 shadow-lg">
      <div className="font-bold text-lg bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">Order Summary</div>
      
      {/* Product Image */}
      {productImage && (
        <div className="mt-4 w-full aspect-square overflow-hidden rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md">
          <img src={productImage} alt={productTitle} className="h-full w-full object-cover" />
        </div>
      )}
      
      <div className="mt-3 text-sm text-neutral-700">
  <div className="flex items-center justify-between"><span>Subtotal ({quantity} {quantity === 1 ? 'unit' : 'units'})</span><span>{formatCurrencyStable(subtotal ?? null, currency)}</span></div>
        <div className="flex items-center justify-between"><span>Escrow</span><span>Included</span></div>
  <div className="flex items-center justify-between"><span>Estimated total</span><span>{formatCurrencyStable(subtotal ?? null, currency)}</span></div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-neutral-700">
        <input id="consent" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <label htmlFor="consent" className="select-none">
          I have read and agree to the <Link href="/terms" className="underline hover:text-orange-600">Terms of Service</Link> and <Link href="/refund-policy" className="underline hover:text-orange-600">Refund Policy</Link>.
        </label>
      </div>

      <button 
        disabled={disabled} 
        onClick={handlePayment}
        className={`mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {processing ? 'Processing...' : 'Proceed to Payment'}
      </button>
      <div className="mt-2 text-xs text-neutral-500">Payment opens when the pool reaches MOQ.</div>
      <div className="mt-4 flex items-center justify-center">
        <Image src={stripeLogo} alt="Stripe" width={80} height={32} className="h-8 w-auto" />
      </div>
      <div className="mt-4">
        <TrustBadges size="sm" />
      </div>
      <div className="mt-4 text-xs text-neutral-600 text-center">
        <Link href="/information/payment-protection" className="underline hover:text-orange-600">Payment Protection</Link>
        <span> · </span>
        <Link href="/how-it-works" className="underline hover:text-orange-600">How it works</Link>
      </div>
    </div>
  );
}
