"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import stripeLogo from "../../company logos/stripe.png";
import paypalLogo from "../../company logos/paypal.png";

export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [paymentMethod, setPaymentMethod] = React.useState<'stripe' | 'paypal' | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Get order details from URL params
  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = searchParams.get('currency') || 'USD';
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const listingId = searchParams.get('listingId') || '';
  const poolId = searchParams.get('poolId') || '';
  const productTitle = searchParams.get('title') || 'Product';
  
  // Card details state
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [cvv, setCvv] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  
  // Billing address state
  const [email, setEmail] = React.useState('');
  const [country, setCountry] = React.useState('US');
  const [zipCode, setZipCode] = React.useState('');
  
  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };
  
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19); // Max 16 digits + 3 spaces
  };
  
  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };
  
  const handleStripePayment = async () => {
    setError(null);
    setProcessing(true);
    
    try {
      // Validate card details
      if (!cardNumber || !expiryDate || !cvv || !cardName || !email) {
        throw new Error('Please fill in all card details');
      }
      
      if (cardNumber.replace(/\s/g, '').length < 13) {
        throw new Error('Invalid card number');
      }
      
      if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
        throw new Error('Invalid expiry date (MM/YY)');
      }
      
      if (cvv.length < 3) {
        throw new Error('Invalid CVV');
      }
      
      // TODO: Call Stripe API
      const response = await fetch('/api/payment/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          quantity,
          listingId,
          poolId,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiryDate,
          cvv,
          cardName,
          email,
          country,
          zipCode,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }
      
      // Redirect to success page
      router.push(`/payment/success?orderId=${data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  const handlePayPalPayment = async () => {
    setError(null);
    setProcessing(true);
    
    try {
      // TODO: Call PayPal API
      const response = await fetch('/api/payment/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          quantity,
          listingId,
          poolId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }
      
      // Redirect to PayPal
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'stripe') {
      handleStripePayment();
    } else if (paymentMethod === 'paypal') {
      handlePayPalPayment();
    }
  };
  
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
  
  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link href="/checkout" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Back to checkout
        </Link>
      </div>
      
      <h1 className="text-2xl font-semibold text-neutral-900">Complete Payment</h1>
      <div className="mt-1 text-sm text-neutral-600">
        Your payment is protected with escrow. We only capture payment once MOQ is met.
      </div>
      
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">Payment Method</h2>
            
            {/* Payment Method Selection */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Image src={stripeLogo} alt="Stripe" width={60} height={24} className="h-6 w-auto" />
                <span className="text-sm font-medium">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Image src={paypalLogo} alt="PayPal" width={60} height={24} className="h-6 w-auto" />
              </button>
            </div>
            
            {/* Stripe Card Form */}
            {paymentMethod === 'stripe' && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-neutral-700">
                    Card Number
                  </label>
                  <input
                    id="cardNumber"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="expiry" className="block text-sm font-medium text-neutral-700">
                      Expiry Date
                    </label>
                    <input
                      id="expiry"
                      type="text"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-neutral-700">
                      CVV
                    </label>
                    <input
                      id="cvv"
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="cardName" className="block text-sm font-medium text-neutral-700">
                    Cardholder Name
                  </label>
                  <input
                    id="cardName"
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-neutral-700">
                      Country
                    </label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                      required
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="SG">Singapore</option>
                      <option value="MY">Malaysia</option>
                      <option value="IN">India</option>
                      <option value="CN">China</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-neutral-700">
                      ZIP / Postal Code
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={processing}
                  className={`w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition-all ${
                    processing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-800'
                  }`}
                >
                  {processing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
                </button>
              </form>
            )}
            
            {/* PayPal */}
            {paymentMethod === 'paypal' && (
              <div className="mt-6">
                <p className="text-sm text-neutral-600 mb-4">
                  You will be redirected to PayPal to complete your payment securely.
                </p>
                
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handlePayPalPayment}
                  disabled={processing}
                  className={`w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition-all ${
                    processing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-800'
                  }`}
                >
                  {processing ? 'Redirecting...' : `Continue to PayPal`}
                </button>
              </div>
            )}
            
            {!paymentMethod && (
              <div className="mt-6 text-center text-sm text-neutral-500">
                Please select a payment method above
              </div>
            )}
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-neutral-900">Order Summary</h3>
            
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-neutral-700 flex-1 mr-2">{decodeURIComponent(productTitle)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Quantity</span>
                <span className="text-neutral-900">{quantity} units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Unit Price</span>
                <span className="text-neutral-900">{formatCurrency(amount / quantity)}</span>
              </div>
              
              <div className="border-t border-neutral-200 pt-2 mt-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-neutral-900">Total</span>
                  <span className="text-neutral-900">{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-neutral-500">
              <p>🔒 Secure payment with escrow protection</p>
              <p className="mt-1">💳 Payment captured only when MOQ is met</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
