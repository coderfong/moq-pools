"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import stripeLogo from "../../company logos/stripe.png";
import StripeCheckoutForm from "./StripeCheckoutForm";

// Load Stripe with your publishable key
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function PaymentClientSecure() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Get order details from URL params
  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = searchParams.get('currency') || 'USD';
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const listingId = searchParams.get('listingId') || '';
  const poolId = searchParams.get('poolId') || '';
  const productTitle = searchParams.get('title') || 'Product';
  const productImage = searchParams.get('img') || '';
  const email = searchParams.get('email') || '';
  
  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // Create Payment Intent on mount
  React.useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Creating payment intent with:', {
          amount,
          currency,
          quantity,
          listingId,
          poolId,
          email,
        });
        
        const response = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            quantity,
            listingId,
            poolId,
            email: email || 'customer@example.com', // Default email for test mode
          }),
        });
        
        const data = await response.json();
        
        console.log('Payment intent response:', {
          ok: response.ok,
          status: response.status,
          data,
        });
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }
        
        if (!data.clientSecret) {
          throw new Error('No client secret received from server');
        }
        
        console.log('Client secret received, setting state...');
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Payment intent error:', err);
        setError(err.message || 'Failed to initialize payment. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (amount && currency && (poolId || listingId)) {
      createPaymentIntent();
    } else {
      setLoading(false);
      console.log('Missing required params:', { amount, currency, poolId, listingId });
    }
  }, [amount, currency, quantity, listingId, poolId, email]);
  
  if (!listingId && !poolId) {
    return (
      <div className="mx-auto w-full max-w-[600px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Invalid Payment Link</h1>
        <p className="mt-2 text-neutral-600">Please return to checkout and try again.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-neutral-900 underline">
          Browse Products
        </Link>
      </div>
    );
  }
  
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#f97316',
      colorBackground: '#ffffff',
      colorText: '#171717',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  // Debug logging
  React.useEffect(() => {
    console.log('Payment State:', {
      clientSecret: clientSecret ? 'Present' : 'Missing',
      loading,
      error,
      stripePromise: stripePromise ? 'Loaded' : 'Not loaded',
      amount,
      currency,
      poolId,
      listingId,
    });
  }, [clientSecret, loading, error, amount, currency, poolId, listingId]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
      <div className="mb-6">
        <Link href={`/checkout?${poolId ? `poolId=${poolId}` : `listingId=${listingId}`}`} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Back to checkout
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">Complete Payment</h1>
      <div className="mt-2 text-base text-gray-700">
        Your payment is protected with escrow. We only capture payment once MOQ is met.
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-white to-orange-50/20 p-8 shadow-lg">
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">Payment Method</h2>
            
            {/* Payment Method Selection */}
            <div className="mt-6">
              <div className="flex items-center gap-3 rounded-xl border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 p-5 shadow-md">
                <Image src={stripeLogo} alt="Stripe" width={80} height={32} className="h-8 w-auto" />
                <span className="text-base font-semibold text-orange-900">Secure Card Payment</span>
              </div>
            </div>
            
            {/* Loading State */}
            {loading && (
              <div className="mt-8 text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <p className="mt-4 text-neutral-600">Initializing secure payment...</p>
              </div>
            )}
            
            {/* Error State */}
            {error && !loading && (
              <div className="mt-8 rounded-xl bg-red-50 border-2 border-red-300 p-6 text-sm text-red-700">
                <p className="font-semibold">⚠️ Error</p>
                <p className="mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {/* Stripe Elements Form */}
            {clientSecret && !loading && !error && stripePromise && (
              <div className="mt-8">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                  <StripeCheckoutForm
                    amount={amount}
                    currency={currency}
                    poolId={poolId}
                    listingId={listingId}
                  />
                </Elements>
              </div>
            )}
            
            {/* Test Mode Warning */}
            {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !loading && (
              <div className="mt-8 rounded-xl bg-amber-50 border-2 border-amber-300 p-6 text-sm text-amber-800">
                <p className="font-semibold">⚠️ Test Mode</p>
                <p className="mt-1">Stripe is not configured. Use test card: 4242 4242 4242 4242</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-white to-orange-50/20 p-6 shadow-lg sticky top-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">Order Summary</h3>
            
            {/* Product Image */}
            {productImage && (
              <div className="mt-6 w-full aspect-square overflow-hidden rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md">
                <img src={productImage} alt={decodeURIComponent(productTitle)} className="h-full w-full object-cover" />
              </div>
            )}
            
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start justify-between pb-3 border-b border-orange-200">
                <span className="text-neutral-800 font-medium flex-1 mr-2">{decodeURIComponent(productTitle)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Quantity</span>
                <span className="text-neutral-900 font-semibold">{quantity} units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Unit Price</span>
                <span className="text-neutral-900 font-semibold">{formatCurrency(amount / quantity)}</span>
              </div>
              
              <div className="border-t-2 border-orange-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-900">Total</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-2 text-xs text-neutral-600 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
              <p className="font-medium">🔒 Secure payment with escrow protection</p>
              <p className="font-medium">💳 Payment captured only when MOQ is met</p>
              <p className="font-medium">🛡️ PCI-DSS compliant via Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
