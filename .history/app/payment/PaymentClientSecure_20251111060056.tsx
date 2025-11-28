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
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/50"></div>
        <div className="absolute top-20 right-20 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl animate-blob"></div>
        <div className="absolute bottom-20 left-20 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        {/* Back Button */}
        <div className="mb-8 animate-fade-in-up">
          <Link 
            href={`/checkout?${poolId ? `poolId=${poolId}` : `listingId=${listingId}`}`} 
            className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors group"
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to checkout
          </Link>
        </div>
        
        {/* Page Header */}
        <div className="animate-fade-in-up animation-delay-100">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">
            Complete Payment
          </h1>
          <div className="mt-3 flex items-center gap-2 text-base text-gray-700">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your payment is protected with <strong>escrow</strong>. We only capture payment once MOQ is met.</span>
          </div>
        </div>
      
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Payment Form */}
        <div className="lg:col-span-2 animate-fade-in-up animation-delay-200">
          <div className="rounded-3xl border-2 border-orange-200/60 bg-gradient-to-br from-white via-orange-50/10 to-amber-50/20 p-8 shadow-2xl backdrop-blur-sm hover:shadow-3xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">
                Payment Method
              </h2>
            </div>
            
            {/* Payment Method Selection */}
            <div className="mt-6">
              <div className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border-2 border-orange-400 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-100/50 to-amber-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center gap-4 w-full">
                  <Image src={stripeLogo} alt="Stripe" width={90} height={36} className="h-9 w-auto" />
                  <div className="flex-1">
                    <span className="block text-lg font-bold text-orange-900">Secure Card Payment</span>
                    <span className="text-xs text-orange-700">Powered by Stripe • PCI-DSS Level 1</span>
                  </div>
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {loading && (
              <div className="mt-10 text-center py-16">
                <div className="relative inline-block">
                  <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-20"></div>
                  <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600"></div>
                </div>
                <p className="mt-6 text-lg font-medium text-neutral-700">Initializing secure payment...</p>
                <p className="mt-2 text-sm text-neutral-500">Please wait while we set up your encrypted connection</p>
              </div>
            )}
            
            {/* Error State */}
            {error && !loading && (
              <div className="mt-10 rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 p-8 text-sm shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-red-900">⚠️ Payment Initialization Error</p>
                    <p className="mt-2 text-red-700">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-6 py-3 text-sm font-bold hover:bg-red-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stripe Elements Form */}
            {clientSecret && !loading && !error && stripePromise && (
              <div className="mt-10">
                {/* Key prop prevents re-mounting with same clientSecret in React strict mode */}
                <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance }}>
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
              <div className="mt-10 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-400 p-8 text-sm shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-900">⚠️ Test Mode Active</p>
                    <p className="mt-2 text-amber-800">Stripe is not configured. Use test card: <code className="font-mono bg-white px-2 py-1 rounded">4242 4242 4242 4242</code></p>
                  </div>
                </div>
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
