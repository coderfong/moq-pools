"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface StripeCheckoutFormProps {
  amount: number;
  currency: string;
  poolId?: string;
  listingId?: string;
}

export default function StripeCheckoutForm({
  amount,
  currency,
  poolId,
  listingId,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isElementReady, setIsElementReady] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('StripeCheckoutForm mounted:', {
      stripe: stripe ? 'Loaded' : 'Not loaded',
      elements: elements ? 'Loaded' : 'Not loaded',
      amount,
      currency,
      poolId,
      listingId,
    });
  }, [stripe, elements, amount, currency, poolId, listingId]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        // Payment failed
        setError(stripeError.message || 'Payment failed. Please try again.');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - confirm on server
        try {
          await fetch('/api/payment/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              poolId,
              listingId,
              amount,
              currency,
            }),
          });
        } catch (confirmError) {
          console.error('Failed to confirm payment on server:', confirmError);
          // Don't fail the redirect - payment already succeeded
        }

        // Redirect to success page
        router.push(`/payment/success?orderId=${paymentIntent.id}`);
      } else {
        setError('Payment confirmation failed. Please contact support.');
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Stripe Payment Element */}
      <div className="rounded-2xl border-2 border-orange-300 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {!isElementReady && (
          <div className="py-12 text-center">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-20"></div>
              <div className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600"></div>
            </div>
            <p className="text-base font-medium text-neutral-700">Loading payment form...</p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${stripe ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                Stripe: {stripe ? 'Connected' : 'Connecting...'}
              </span>
              <span className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${elements ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                Elements: {elements ? 'Ready' : 'Loading...'}
              </span>
            </div>
          </div>
        )}
        <div className={isElementReady ? 'block' : 'hidden'}>
          <PaymentElement 
            onReady={() => {
              console.log('PaymentElement ready');
              setIsElementReady(true);
            }}
            onLoadError={(event) => {
              console.error('PaymentElement load error - Full event:', JSON.stringify(event, null, 2));
              console.error('Error object:', event.error);
              const errorMsg = event.error?.message || 'Unknown error';
              setError(`Payment form failed to load: ${errorMsg}`);
            }}
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4 text-sm text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300 ${
          !stripe || processing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            Processing...
          </span>
        ) : (
          `💳 Pay ${formatCurrency(amount)}`
        )}
      </button>

      {/* Security Info */}
      <div className="text-xs text-center text-neutral-600">
        <p>🔒 Your payment information is encrypted and secure</p>
        <p className="mt-1">We never see or store your card details</p>
      </div>
    </form>
  );
}
