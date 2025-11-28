import { Suspense } from 'react';
import PaymentClient from './PaymentClient';

export const metadata = {
  title: "Payment | MOQ Pools",
  description: "Complete your payment securely with Stripe or PayPal",
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PaymentClient />
    </Suspense>
  );
}
