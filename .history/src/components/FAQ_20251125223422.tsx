"use client";
import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'ordering' | 'shipping' | 'payment' | 'account';
}

const faqs: FAQItem[] = [
  {
    category: 'general',
    question: 'What is MOQ Pooling?',
    answer: 'MOQ Pooling allows multiple buyers to combine their orders to meet the Minimum Order Quantity (MOQ) required by suppliers. This way, you can access wholesale prices even for small quantities by pooling orders with other buyers.'
  },
  {
    category: 'general',
    question: 'How does PoolBuy work?',
    answer: 'Browse products, join a pool for items you want, and pay securely. Once the pool reaches its MOQ, we place a bulk order with the supplier. Your items are then shipped directly to you at wholesale prices.'
  },
  {
    category: 'general',
    question: 'What are the benefits of pooling?',
    answer: 'You get wholesale prices without buying in bulk, access to products from global suppliers (Alibaba, Made-in-China, IndiaMART), secure payment protection, and the ability to order small quantities at great prices.'
  },
  {
    category: 'ordering',
    question: 'What happens if a pool doesn\'t reach MOQ?',
    answer: 'If a pool doesn\'t reach its MOQ within the deadline, all participants receive a full refund. No charges are made until the pool successfully meets the minimum order quantity.'
  },
  {
    category: 'ordering',
    question: 'Can I cancel my order?',
    answer: 'You can cancel before the pool closes and reaches MOQ. Once the pool is locked and the order is placed with the supplier, cancellations are subject to our refund policy.'
  },
  {
    category: 'ordering',
    question: 'How long does it take for a pool to fill?',
    answer: 'It varies by product popularity and MOQ size. Some pools fill within days, others may take 1-2 weeks. You\'ll receive notifications about pool progress at 50%, 90%, and when MOQ is reached.'
  },
  {
    category: 'payment',
    question: 'Is my payment secure?',
    answer: 'Yes! We use Stripe for payment processing with bank-level encryption. Your payment is held securely and only processed when the pool reaches MOQ. We\'re PCI-DSS compliant and use SSL encryption.'
  },
  {
    category: 'payment',
    question: 'When am I charged?',
    answer: 'Your payment method is authorized when you join a pool, but you\'re only charged once the pool reaches its MOQ and the order is confirmed. If the pool fails, you\'re never charged.'
  },
  {
    category: 'payment',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and bank transfers through our secure Stripe payment gateway.'
  },
  {
    category: 'shipping',
    question: 'How long does shipping take?',
    answer: 'International shipping from suppliers typically takes 2-4 weeks depending on your location and the origin country. You\'ll receive tracking information once your order ships.'
  },
  {
    category: 'shipping',
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to most countries worldwide. Shipping costs and delivery times vary by destination and are calculated at checkout.'
  },
  {
    category: 'shipping',
    question: 'What about customs and duties?',
    answer: 'Customs duties and import taxes are the buyer\'s responsibility and vary by country. We recommend checking your local customs regulations before ordering.'
  },
  {
    category: 'account',
    question: 'Do I need to create an account?',
    answer: 'Yes, an account is required to join pools, track orders, and receive notifications. Creating an account is free and takes less than a minute.'
  },
  {
    category: 'account',
    question: 'How do I track my orders?',
    answer: 'Once logged in, visit your account dashboard to see all your active and past orders. You\'ll also receive email notifications with tracking information when your order ships.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General' },
    { id: 'ordering', label: 'Ordering' },
    { id: 'payment', label: 'Payment' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'account', label: 'Account' }
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  return (
    <section className="py-24 md:py-28 lg:py-32 bg-gradient-to-b from-white to-gray-50" id="faq">
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-8 shadow-lg shadow-orange-500/30">
            <HelpCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto font-medium">
            Everything you need to know about MOQ pooling and how PoolBuy works
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-full text-base font-medium transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-orange-500 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-5">
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-xl text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-500 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-8 pb-6 text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-5">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions? */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-1">Still have questions?</h3>
              <p className="text-sm text-gray-600">Our support team is here to help</p>
            </div>
            <a
              href="/support"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 whitespace-nowrap"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
