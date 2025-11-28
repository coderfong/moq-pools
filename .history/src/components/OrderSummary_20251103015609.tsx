"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";
import TrustBadges from "./TrustBadges";
import { formatCurrencyStable } from "@/lib/format";

export default function OrderSummary({ unitPrice, currency, paymentEnabled = false }: { unitPrice: number | null; currency: string; paymentEnabled?: boolean }) {
  const [agreed, setAgreed] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const disabled = !paymentEnabled || !agreed || processing;
  
  const handlePayment = async () => {
    if (disabled) return;
    
    setProcessing(true);
    try {
      // TODO: Implement actual payment processing
      // For now, just show a message
      alert('Payment processing will be implemented here. This would create a Stripe checkout session or PayPal order.');
      console.log('Payment initiated:', { unitPrice, currency });
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
      <div className="font-medium text-neutral-900">Order Summary</div>
      <div className="mt-2 text-sm text-neutral-700">
  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrencyStable(unitPrice ?? null, currency)}</span></div>
        <div className="flex items-center justify-between"><span>Escrow</span><span>Included</span></div>
  <div className="flex items-center justify-between"><span>Estimated total</span><span>{formatCurrencyStable(unitPrice ?? null, currency)}</span></div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-neutral-700">
        <input id="consent" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <label htmlFor="consent" className="select-none">
          I have read and agree to the <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/refund-policy" className="underline">Refund Policy</Link>.
        </label>
      </div>

      <button 
        disabled={disabled} 
        onClick={handlePayment}
        className={`mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-800 cursor-pointer'}`}
      >
        {processing ? 'Processing...' : 'Proceed to Payment'}
      </button>
      <div className="mt-2 text-xs text-neutral-500">Payment opens when the pool reaches MOQ.</div>
      <div className="mt-3 flex items-center gap-3">
        <Image src={stripeLogo} alt="Stripe" width={60} height={24} className="h-6 w-auto" />
        <Image src={paypalLogo} alt="PayPal" width={60} height={24} className="h-6 w-auto" />
      </div>
      <div className="mt-3">
        <TrustBadges size="sm" />
      </div>
      <div className="mt-3 text-xs text-neutral-600">
        <Link href="/information/payment-protection" className="underline">Payment Protection</Link>
        <span> · </span>
        <Link href="/how-it-works" className="underline">How it works</Link>
      </div>
    </div>
  );
}
