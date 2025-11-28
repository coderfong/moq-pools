import Hero from '@/components/Hero';
import HowItWorksNew from '@/components/HowItWorksNew';
import TrustStrip from '@/components/TrustStrip';
import { RevealSection } from '@/components/Reveal';
import Benefits from '@/components/Benefits';
import CTA from '@/components/CTA';
import TrustSignals from '@/components/TrustSignals';
import FAQ from '@/components/FAQ';
import Link from 'next/link';

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
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden">
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
          {category}
        </div>
        
        {/* Savings Badge */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
          {badge}
        </div>

        {/* Urgent Badge */}
        {urgent && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-lg">
            🔥 Filling Fast!
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3 className="text-lg font-bold line-clamp-2 text-gray-900 group-hover:text-orange-600 transition-colors min-h-[3.5rem]">
          {title}
        </h3>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Progress to MOQ</span>
            <span className="font-bold text-gray-900">
              {progress}/{total} orders
            </span>
          </div>
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAlmostFull
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {isAlmostFull && (
            <p className="text-xs text-green-600 font-semibold">Almost there! 🎉</p>
          )}
        </div>

        {/* Price and Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-3xl font-bold text-gray-900">${price}</div>
            <div className="text-sm text-gray-500 line-through">${originalPrice}</div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="font-medium">{joined} joined</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className={`font-medium ${daysLeft <= 2 ? 'text-red-600' : ''}`}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            </div>
          </div>
        </div>

        {/* Join Button */}
        <Link
          href="/products"
          className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-200 hover:scale-105"
        >
          Join This Pool
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

      {/* Active Pools - Redesigned */}
      <section id="pools" className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Limited Time Offers
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Active Pools Filling Fast
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Join now to secure your spot and unlock wholesale pricing
            </p>
          </div>

          {/* Pool Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <PoolCard
              image="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80"
              category="Electronics"
              badge="Save 40%"
              title="Premium Wireless Earbuds - Active Noise Cancellation"
              progress={87}
              total={100}
              price={89}
              originalPrice={149}
              joined={87}
              daysLeft={3}
              urgent={true}
            />

            <PoolCard
              image="https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800&q=80"
              category="Home & Living"
              badge="Save 38%"
              title="Organic Cotton Bath Towel Set (6-Pack)"
              progress={142}
              total={150}
              price={49}
              originalPrice={79}
              joined={142}
              daysLeft={2}
              urgent={true}
            />

            <PoolCard
              image="https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80"
              category="Sports & Fitness"
              badge="Save 51%"
              title="Professional Yoga Mat with Carrying Strap"
              progress={68}
              total={200}
              price={29}
              originalPrice={59}
              joined={68}
              daysLeft={5}
            />

            <PoolCard
              image="https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80"
              category="Outdoor"
              badge="Save 51%"
              title="Stainless Steel Water Bottle - 32oz Insulated"
              progress={231}
              total={250}
              price={22}
              originalPrice={45}
              joined={231}
              daysLeft={1}
              urgent={true}
            />

            <PoolCard
              image="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"
              category="Home Office"
              badge="Save 45%"
              title="LED Desk Lamp with USB Charging Port"
              progress={45}
              total={100}
              price={49}
              originalPrice={89}
              joined={45}
              daysLeft={6}
            />

            <PoolCard
              image="https://images.unsplash.com/photo-1594818898109-44704fb548f6?w=800&q=80"
              category="Kitchen"
              badge="Save 46%"
              title="Bamboo Cutting Board Set (3 Pieces)"
              progress={178}
              total={200}
              price={35}
              originalPrice={65}
              joined={178}
              daysLeft={4}
              urgent={true}
            />
          </div>

          {/* View All CTA */}
          <div className="text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 hover:scale-105"
            >
              View All Pools
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
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

      {/* CTA */}
      <RevealSection>
        <CTA />
      </RevealSection>
    </div>
  );
}
