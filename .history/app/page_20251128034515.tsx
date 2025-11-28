import Hero from '@/components/Hero';
import HowItWorksNew from '@/components/HowItWorksNew';
import TrustStrip from '@/components/TrustStrip';
import { RevealSection } from '@/components/Reveal';
import Benefits from '@/components/Benefits';
import CTA from '@/components/CTA';
import TrustSignals from '@/components/TrustSignals';
import FAQ from '@/components/FAQ';
import Link from 'next/link';
import FeaturedPools from './FeaturedPools';

export const dynamic = 'force-dynamic';

// Pool Card Component
function PoolCard({
  image,
  category,
  badge,
  title,
  progress,
  total,
  price,
  originalPrice,
  joined,
  daysLeft,
  urgent = false,
}: {
  image: string;
  category: string;
  badge: string;
  title: string;
  progress: number;
  total: number;
  price: number;
  originalPrice: number;
  joined: number;
  daysLeft: number;
  urgent?: boolean;
}) {
  const percentage = (progress / total) * 100;
  const isAlmostFull = percentage >= 90;

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden animate-fade-in-up">
      {/* Enhanced shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
      
      {/* Image Section with improved overlay */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Category Badge - Enhanced */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-gray-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-gray-100 hover:scale-110 transition-transform">
          {category}
        </div>
        
        {/* Savings Badge - Enhanced with pulse */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-xl animate-pulse-slow">
          {badge}
        </div>

        {/* Urgent Badge - Enhanced */}
        {urgent && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-2xl flex items-center gap-1.5">
            <svg className="w-4 h-4 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
            </svg>
            Filling Fast!
          </div>
        )}
      </div>

      {/* Content Section with better spacing */}
      <div className="p-6 space-y-5">
        {/* Title with better typography */}
        <h3 className="text-lg font-bold line-clamp-2 text-gray-900 group-hover:text-orange-600 transition-colors duration-300 min-h-[3.5rem] leading-tight">
          {title}
        </h3>

        {/* Enhanced Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-semibold">Progress to MOQ</span>
            <span className="font-bold text-gray-900 tabular-nums">
              {progress}/{total}
            </span>
          </div>
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isAlmostFull
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600'
                  : 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            >
              {/* Shimmer effect on progress bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
          </div>
          {isAlmostFull && (
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Almost there! 🎉
            </p>
          )}
        </div>

        {/* Price and Stats - Enhanced layout */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-gray-100">
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tabular-nums">
              ${price}
            </div>
            <div className="text-sm text-gray-400 line-through font-medium tabular-nums">${originalPrice}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="font-semibold tabular-nums">{joined}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${daysLeft <= 2 ? 'text-red-500' : 'text-orange-500'}`}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className={`font-semibold tabular-nums ${daysLeft <= 2 ? 'text-red-600' : ''}`}>
                {daysLeft}d
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Join Button */}
        <Link
          href="/products"
          className="relative block w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white text-center py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 overflow-hidden group/btn"
        >
          <span className="relative z-10">Join This Pool</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover/btn:translate-x-full transition-transform duration-1000"></div>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <RevealSection>
        <Hero />
      </RevealSection>

      {/* Company logos */}
      <RevealSection>
        <TrustStrip />
      </RevealSection>

      {/* How it works */}
      <section id="how-it-works">
        <RevealSection>
          <HowItWorksNew />
        </RevealSection>
      </section>

      {/* Active Pools - Enhanced Design */}
      <section id="pools" className="relative py-24 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-amber-100/30 to-transparent rounded-full blur-3xl"></div>
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 px-5 py-2.5 rounded-full text-sm font-bold mb-8 shadow-lg border border-orange-100 hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse-slow">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Limited Time Offers
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Active Pools{' '}
              </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Filling Fast
                </span>
                <svg className="absolute -right-8 -top-4 w-10 h-10 text-orange-400 opacity-30 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                </svg>
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 font-medium max-w-2xl mx-auto">
              Join now to secure your spot and unlock <span className="text-orange-600 font-bold">wholesale pricing</span>
            </p>
          </div>

          {/* Pool Cards Grid - Dynamic from database */}
          <FeaturedPools />

          {/* Enhanced View All CTA */}
          <div className="text-center mt-8 animate-fade-in">
            <Link
              href="/products"
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                View All Pools
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white">
        <RevealSection>
          <Benefits />
        </RevealSection>
      </section>

      {/* Trust Signals & Social Proof */}
      <RevealSection>
        <TrustSignals />
      </RevealSection>

      {/* FAQ Section */}
      <RevealSection>
        <FAQ />
      </RevealSection>

      {/* CTA */}
      <RevealSection>
        <CTA />
      </RevealSection>
    </div>
  );
}
