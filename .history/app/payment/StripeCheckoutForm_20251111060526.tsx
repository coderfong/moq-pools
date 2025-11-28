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
  
  // Shipping address state
  const [shippingAddress, setShippingAddress] = React.useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

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
        <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-900">⚠️ Payment Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-8 py-5 text-lg font-extrabold text-white shadow-2xl hover:shadow-3xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
          !stripe || processing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {processing ? (
            <>
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Payment...
            </>
          ) : (
            <>
              <svg className="h-6 w-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay {formatCurrency(amount)}
              <svg className="h-6 w-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </span>
      </button>

      {/* Security Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-700 bg-green-50 border border-green-200 rounded-xl py-3 px-4">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="font-semibold">Your payment information is encrypted and secure</p>
        </div>
        <p className="text-xs text-neutral-500">We never see or store your card details • Powered by Stripe</p>
      </div>
    </form>
  );
}
