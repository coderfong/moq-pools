"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'N/A';
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; duration: number; color: string }>>([]);
  
  useEffect(() => {
    // Generate confetti particles
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    
    setConfetti(particles);
    
    // Clear confetti after animation
    const timer = setTimeout(() => setConfetti([]), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      {/* Confetti Animation */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute top-0 animate-confetti-fall"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          >
            <div
              className="h-3 w-3 rotate-45"
              style={{ backgroundColor: particle.color }}
            />
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[680px] px-4 py-16 text-center">
        {/* Success Icon with Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-20"></div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50 animate-scale-in">
              <svg className="h-12 w-12 text-white animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Success Message */}
        <h1 className="text-4xl font-bold text-neutral-900 animate-fade-in-up">
          Payment Successful! 🎉
        </h1>
        <p className="mt-4 text-lg text-neutral-600 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Your payment has been processed and your order has been placed.
        </p>
        
        {/* Order ID Card */}
        <div className="mt-8 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="text-sm font-semibold uppercase tracking-wider text-green-700">Order ID</div>
          <div className="mt-2 font-mono text-lg font-medium text-neutral-900 break-all">{orderId}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-xs font-medium text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Processing
          </div>
        </div>
        
        {/* Escrow Info Card */}
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 text-left shadow-lg animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-900">🔒 Your payment is held in escrow</p>
              <p className="mt-2 text-sm text-blue-800 leading-relaxed">
                We'll only capture the payment once the pool reaches its minimum order quantity (MOQ).
                You'll receive updates via email about your order status.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link
            href="/orders"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">View My Orders</span>
            <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-800 to-neutral-700 opacity-0 transition-opacity group-hover:opacity-100"></div>
          </Link>
          <Link
            href="/products"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 shadow-md transition-all hover:border-neutral-400 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <span>Continue Shopping</span>
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </Link>
        </div>
        
        {/* Support Footer */}
        <div className="mt-12 rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <p className="font-medium text-neutral-700">Need help?</p>
          <p className="mt-1">Contact us at <a href="mailto:support@moqpools.com" className="font-semibold text-blue-600 hover:underline">support@moqpools.com</a></p>
        </div>
      </div>
    </>
  );
}
