"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'N/A';
  
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-neutral-900">Payment Successful!</h1>
      <p className="mt-3 text-neutral-600">
        Your payment has been processed and your order has been placed.
      </p>
      
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="text-sm text-neutral-600">Order ID</div>
        <div className="mt-1 font-mono text-sm text-neutral-900">{orderId}</div>
      </div>
      
      <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-medium">🔒 Your payment is held in escrow</p>
        <p className="mt-1">
          We'll only capture the payment once the pool reaches its minimum order quantity (MOQ).
          You'll receive updates via email.
        </p>
      </div>
      
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/orders"
          className="inline-block rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          View My Orders
        </Link>
        <Link
          href="/products"
          className="inline-block rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Continue Shopping
        </Link>
      </div>
      
      <div className="mt-8 text-xs text-neutral-500">
        <p>Questions? Contact us at support@moqpools.com</p>
      </div>
    </div>
  );
}
