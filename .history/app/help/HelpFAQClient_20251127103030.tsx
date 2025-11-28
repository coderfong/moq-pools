'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    id: 'what-is-pooling',
    category: 'Getting Started',
    question: 'What is MOQ pooling and how does it work?',
    answer: 'MOQ pooling allows multiple buyers to combine their orders to meet a supplier\'s Minimum Order Quantity (MOQ). Instead of buying 1000 units alone, you can buy 10 units while others buy the rest. Once the pool reaches the MOQ, we place the bulk order and everyone gets wholesale pricing.'
  },
  {
    id: 'how-to-join',
    category: 'Getting Started',
    question: 'How do I join a pool?',
    answer: 'Browse active pools, select a product you like, choose your quantity, and proceed to payment. Your payment is held securely in escrow until the MOQ is reached. If the pool doesn\'t reach the MOQ by the deadline, you\'ll receive a full refund automatically.'
  },
  {
    id: 'payment-safe',
    category: 'Payments',
    question: 'Is my payment safe?',
    answer: 'Yes! We use Stripe\'s secure payment processing and escrow system. Your payment is authorized but not charged until the pool reaches its MOQ. Funds are held securely and only released when the supplier ships your order. This protects both buyers and ensures suppliers get paid.'
  },
  {
    id: 'what-is-escrow',
    category: 'Payments',
    question: 'What is escrow and why do you use it?',
    answer: 'Escrow is a secure third-party payment holding service. When you join a pool, your payment is authorized but held by Stripe (not us, not the supplier). The funds are only released when we confirm shipment. This protects you from fraud and ensures suppliers ship products before receiving payment.'
  },
  {
    id: 'refund-policy',
    category: 'Payments',
    question: 'What is your refund policy?',
    answer: 'If a pool doesn\'t reach its MOQ by the deadline, all participants receive automatic refunds within 5-7 business days. Once an order is placed, refunds follow our standard return policy: items must be unused, in original packaging, and returned within 30 days of delivery (buyer pays return shipping).'
  },
  {
    id: 'payment-methods',
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), debit cards, and digital wallets (Apple Pay, Google Pay) through Stripe. All payments are processed securely with bank-level encryption.'
  },
  {
    id: 'shipping-time',
    category: 'Shipping',
    question: 'How long does shipping take?',
    answer: 'After a pool reaches its MOQ, we place the bulk order with the supplier (1-3 days). Manufacturing and preparation typically takes 7-14 days for most products. International shipping adds another 10-20 days depending on your location. You\'ll receive tracking information as soon as your order ships.'
  },
  {
    id: 'track-order',
    category: 'Shipping',
    question: 'How can I track my order?',
    answer: 'Visit your Account Dashboard → Order Tracking to see real-time status updates. Once shipped, you\'ll receive a tracking number via email and in your account. We send alerts at every major milestone: MOQ reached, order placed, shipped, out for delivery, and delivered.'
  },
  {
    id: 'shipping-costs',
    category: 'Shipping',
    question: 'Are shipping costs included?',
    answer: 'Shipping costs are calculated at checkout based on your location and order size. For most bulk orders, we offer discounted shipping rates. Free shipping is available on orders over $200 in most regions. International orders may incur customs fees (buyer\'s responsibility).'
  },
  {
    id: 'moq-not-reached',
    category: 'Pool Management',
    question: 'What happens if a pool doesn\'t reach its MOQ?',
    answer: 'If the pool deadline passes without reaching the MOQ, the pool closes and all participants receive automatic refunds within 5-7 business days. No one is charged, and your payment authorization is released. You\'ll be notified by email and can join other active pools.'
  },
  {
    id: 'change-quantity',
    category: 'Pool Management',
    question: 'Can I change my quantity after joining?',
    answer: 'Before the MOQ is reached, you can contact support to modify your quantity (subject to availability). Once the MOQ is reached and payment is captured, quantities are locked and cannot be changed. You can cancel and receive a refund only if the order hasn\'t been placed with the supplier yet.'
  },
  {
    id: 'deadline-extension',
    category: 'Pool Management',
    question: 'Can pool deadlines be extended?',
    answer: 'Pool organizers may extend deadlines if the pool is close to reaching its MOQ. You\'ll be notified of any deadline changes via email and in your account dashboard. Participants always have the option to cancel and receive a refund if they don\'t agree with the extension.'
  },
  {
    id: 'product-quality',
    category: 'Products',
    question: 'How do you ensure product quality?',
    answer: 'We partner with verified suppliers on platforms like Alibaba, Made-in-China, and IndiaMART. All suppliers are vetted for quality certifications, trade assurance, and positive buyer reviews. We also offer a 30-day return policy for defective or misrepresented items (see refund policy for details).'
  },
  {
    id: 'bulk-discount',
    category: 'Products',
    question: 'How much can I save with pooling?',
    answer: 'Savings vary by product, but typically range from 30-60% off retail prices. By meeting MOQs, you access wholesale tier pricing that\'s normally only available to large businesses. The more popular a pool, the better the price - higher volumes unlock deeper discounts on many products.'
  },
  {
    id: 'custom-products',
    category: 'Products',
    question: 'Can I request custom products or pooling?',
    answer: 'Yes! Use our "Request Pool" feature to submit product ideas. If we find a reliable supplier and there\'s enough interest (at least 10 people), we\'ll create a pool. Custom branding and modifications are available on some products - contact support for quotes.'
  },
  {
    id: 'account-security',
    category: 'Account',
    question: 'How do I keep my account secure?',
    answer: 'Use a strong, unique password and enable two-factor authentication (coming soon). Never share your login credentials. We\'ll never ask for your password via email. If you suspect unauthorized access, change your password immediately and contact support.'
  },
  {
    id: 'contact-support',
    category: 'Support',
    question: 'How do I contact customer support?',
    answer: 'Email us at support@moqpools.com or use the live chat in your account dashboard (Messages → Admin). We respond within 24 hours on business days. For urgent issues during pool deadlines or shipping problems, mark your message as "Urgent" for priority handling.'
  },
  {
    id: 'seller-join',
    category: 'For Sellers',
    question: 'Can I become a supplier or pool organizer?',
    answer: 'We\'re always looking for quality suppliers! Email partnerships@moqpools.com with your company details, product catalog, and MOQ structure. Pool organizers can earn commission by creating pools (coming soon). Verified sellers get premium placement and trust badges.'
  }
];

const categories = ['All', 'Getting Started', 'Payments', 'Shipping', 'Pool Management', 'Products', 'Account', 'Support', 'For Sellers'];

export default function HelpFAQClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-neutral-600 mb-8">
            Find answers to common questions about MOQ pooling, payments, and shipping
          </p>

          {/* Search Bar */}
          <div className="max-w-[600px] mx-auto relative">
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-neutral-200 focus:border-emerald-500 focus:outline-none text-neutral-900 text-lg"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-white text-neutral-700 border border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4 mb-12">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-neutral-500 text-lg">No questions found matching "{searchQuery}"</p>
              <p className="text-neutral-400 text-sm mt-2">Try different keywords or browse all categories</p>
            </div>
          ) : (
            filteredFaqs.map(faq => (
              <div
                key={faq.id}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mb-2">
                      {faq.category}
                    </span>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {faq.question}
                    </h3>
                  </div>
                  <svg
                    className={`w-6 h-6 text-neutral-400 flex-shrink-0 transition-transform ${
                      expandedIds.has(faq.id) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedIds.has(faq.id) && (
                  <div className="px-6 pb-5 pt-2">
                    <p className="text-neutral-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-emerald-100 text-lg mb-6 max-w-[600px] mx-auto">
            Our support team is here to help! Get personalized assistance with your account, orders, or any questions not covered here.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/account/messages"
              className="px-8 py-4 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message Support
            </Link>
            <a
              href="mailto:support@moqpools.com"
              className="px-8 py-4 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Us
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Link
            href="/pools"
            className="bg-white rounded-2xl p-6 border border-neutral-200 hover:shadow-lg hover:border-emerald-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Browse Pools</h3>
            <p className="text-sm text-neutral-600">Find products and join active pools</p>
          </Link>

          <Link
            href="/account/orders/tracking"
            className="bg-white rounded-2xl p-6 border border-neutral-200 hover:shadow-lg hover:border-blue-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Track Orders</h3>
            <p className="text-sm text-neutral-600">Monitor your pool items from payment to delivery</p>
          </Link>

          <Link
            href="/account/payments"
            className="bg-white rounded-2xl p-6 border border-neutral-200 hover:shadow-lg hover:border-purple-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Payment History</h3>
            <p className="text-sm text-neutral-600">View transactions and manage payment methods</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
