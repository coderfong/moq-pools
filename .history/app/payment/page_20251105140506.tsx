import { Suspense } from 'react';
import PaymentClientSecure from './PaymentClientSecure';

export const metadata = {
  title: "Payment | MOQ Pools",
  description: "Complete your payment securely with Stripe",
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PaymentClientSecure />
    </Suspense>
  );
}
