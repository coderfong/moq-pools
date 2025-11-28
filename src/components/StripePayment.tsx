"use client";

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  amount: number;
  clientSecret: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function PaymentForm({ amount, clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        onError?.(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('An unexpected error occurred');
      onError?.('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
        
        {/* Stripe Payment Element */}
        <PaymentElement />

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Security notice */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>Your payment information is encrypted and secure</span>
        </div>
      </div>

      {/* Submit button */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-900">Total Amount</span>
          <span className="text-2xl font-bold text-orange-600">${amount.toFixed(2)}</span>
        </div>

        <Button
          type="submit"
          disabled={!stripe || loading}
          className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
        >
          {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-3">
          Powered by Stripe • PCI DSS compliant
        </p>
      </div>
    </form>
  );
}

interface StripePaymentProps {
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function StripePayment({
  amount,
  onSuccess,
  onError,
  className = '',
}: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch PaymentIntent from server
  useState(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.round(amount * 100) }), // Convert to cents
        });

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Failed to create payment intent:', error);
        onError?.('Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="w-8 h-8 border-4 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className={`bg-white rounded-xl border border-red-200 p-6 text-center ${className}`}>
        <p className="text-red-600">Failed to initialize payment. Please try again.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#ea580c',
              colorBackground: '#ffffff',
              colorText: '#111827',
              colorDanger: '#ef4444',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '0.75rem',
            },
          },
        }}
      >
        <PaymentForm
          amount={amount}
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
