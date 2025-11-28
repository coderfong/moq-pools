"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  shape: 'square' | 'circle' | 'triangle';
  size: number;
  rotation: number;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'N/A';
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    // Generate confetti particles with variety
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const shapes: Array<'square' | 'circle' | 'triangle'> = ['square', 'circle', 'triangle'];
    
    const particles = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.5 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: 8 + Math.random() * 8,
      rotation: Math.random() * 360
    }));
    
    setConfetti(particles);
    setShowContent(true);
    
    // Clear confetti after animation
    const timer = setTimeout(() => setConfetti([]), 6000);
    return () => clearTimeout(timer);
  }, []);
  
  const renderParticle = (particle: Particle) => {
    const baseClasses = "absolute top-0 animate-confetti-fall";
    
    if (particle.shape === 'circle') {
      return (
        <div
          key={particle.id}
          className={baseClasses}
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          <div
            className="rounded-full"
            style={{ 
              backgroundColor: particle.color,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
          />
        </div>
      );
    }
    
    if (particle.shape === 'triangle') {
      return (
        <div
          key={particle.id}
          className={baseClasses}
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          <div
            style={{ 
              width: 0,
              height: 0,
              borderLeft: `${particle.size / 2}px solid transparent`,
              borderRight: `${particle.size / 2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
            }}
          />
        </div>
      );
    }
    
    // Square
    return (
      <div
        key={particle.id}
        className={baseClasses}
        style={{
          left: `${particle.left}%`,
          animationDelay: `${particle.delay}s`,
          animationDuration: `${particle.duration}s`,
        }}
      >
        <div
          className="animate-spin-slow"
          style={{ 
            backgroundColor: particle.color,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      </div>
    );
  };
  
  return (
    <>
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 animate-gradient-shift"></div>
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-green-200/30 blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Confetti Animation */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
        {confetti.map((particle) => renderParticle(particle))}
      </div>

      <div className="mx-auto w-full max-w-[720px] px-4 py-12 md:py-20 text-center relative">
        {/* Success Icon with Advanced Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/40 opacity-75"></div>
            <div className="absolute inset-0 animate-pulse rounded-full bg-green-300/20" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Main icon */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-2xl shadow-green-500/50 animate-scale-in ring-4 ring-green-100 ring-offset-4">
              {/* Sparkles */}
              <div className="absolute -top-2 -right-2 text-yellow-400 animate-sparkle">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -left-1 text-yellow-300 animate-sparkle animation-delay-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
                </svg>
              </div>
              
              <svg className="h-14 w-14 text-white animate-check-draw drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Success Message with Gradient Text */}
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 animate-fade-in-up mb-2">
            Payment Successful!
          </h1>
          <div className="inline-flex items-center gap-2 text-2xl animate-fade-in-up animation-delay-100">
            <span className="animate-bounce">🎉</span>
            <span className="animate-bounce animation-delay-100">✨</span>
            <span className="animate-bounce animation-delay-200">🎊</span>
          </div>
        </div>
        
        <p className="mt-6 text-lg md:text-xl text-neutral-600 animate-fade-in-up animation-delay-200 max-w-md mx-auto leading-relaxed">
          Your payment has been processed successfully and your order has been placed.
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
