"use client";
import { Shield, Lock, CreditCard, Truck, RefreshCw, Star, Users, CheckCircle2 } from 'lucide-react';

const trustFeatures = [
  {
    icon: Shield,
    title: 'Buyer Protection',
    description: 'Full refund if pool doesn\'t reach MOQ',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Bank-level encryption with Stripe',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: CreditCard,
    title: 'Payment Hold',
    description: 'Only charged when pool is successful',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Truck,
    title: 'Tracked Shipping',
    description: 'Track your order every step of the way',
    color: 'from-orange-500 to-orange-600'
  }
];

const securityBadges = [
  {
    name: 'SSL Secured',
    icon: Lock,
    description: '256-bit SSL encryption'
  },
  {
    name: 'PCI Compliant',
    icon: Shield,
    description: 'Payment Card Industry certified'
  },
  {
    name: 'Verified Suppliers',
    icon: CheckCircle2,
    description: 'Vetted & trusted partners'
  },
  {
    name: 'Secure Checkout',
    icon: CreditCard,
    description: 'Stripe payment processing'
  }
];

const stats = [
  { number: '10K+', label: 'Happy Customers', icon: Users },
  { number: '50K+', label: 'Orders Fulfilled', icon: CheckCircle2 },
  { number: '4.8/5', label: 'Average Rating', icon: Star },
  { number: '98%', label: 'Success Rate', icon: RefreshCw }
];

export default function TrustSignals() {
  return (
    <div className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Main Trust Features */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 leading-tight">
            Shop with Confidence
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 font-medium">
            Your security and satisfaction are our top priorities
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-12 sm:mb-16 md:mb-20">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-5 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold !text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base md:text-xl">
                  {feature.title}
                </h3>
                <p className="!text-gray-600 text-[10px] sm:text-xs md:text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security Badges */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-16">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-8">
            Trusted & Secure Platform
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {securityBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md mb-3">
                    <Icon className="w-8 h-8 text-orange-500" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100"
              >
                <Icon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer Reviews Preview */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            What Our Customers Say
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sarah Chen',
                role: 'Small Business Owner',
                review: 'PoolBuy helped me get wholesale prices for my boutique without huge upfront costs. Game changer!',
                rating: 5
              },
              {
                name: 'Michael Rodriguez',
                role: 'Online Retailer',
                review: 'The pooling concept is brilliant. I\'ve saved thousands while building my inventory.',
                rating: 5
              },
              {
                name: 'Emily Watson',
                role: 'Startup Founder',
                review: 'Secure, reliable, and excellent customer service. Highly recommend for any entrepreneur.',
                rating: 5
              }
            ].map((review, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4 justify-center">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{review.review}"
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-semibold text-gray-900">{review.name}</p>
                  <p className="text-sm text-gray-500">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
