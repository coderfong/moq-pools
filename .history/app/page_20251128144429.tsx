import Hero from '@/components/Hero';
import HowItWorksNew from '@/components/HowItWorksNew';
import TrustStrip from '@/components/TrustStrip';
import { RevealSection } from '@/components/Reveal';
import Benefits from '@/components/Benefits';
import CTA from '@/components/CTA';
import TrustSignals from '@/components/TrustSignals';
import Link from 'next/link';
import FeaturedPools from './FeaturedPools';

export const dynamic = 'force-dynamic';

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

      {/* Active Pools - Enhanced Design */}
      <section id="pools" className="relative py-20 md:py-28 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
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

      {/* How it works - Quick Overview */}
      <section id="how-it-works" className="bg-white">
        <RevealSection>
          <HowItWorksNew />
        </RevealSection>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-to-b from-white to-gray-50">
        <RevealSection>
          <Benefits />
        </RevealSection>
      </section>

      {/* Trust Signals & Social Proof */}
      <RevealSection>
        <TrustSignals />
      </RevealSection>

      {/* Final CTA */}
      <RevealSection>
        <CTA />
      </RevealSection>
    </div>
  );
}
