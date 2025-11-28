"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, CreditCard, Handshake, Package, Truck, Users, BadgeCheck, Sparkles, ShieldCheck, HelpCircle, ArrowRight, TrendingUp, Globe, Clock } from "lucide-react";

/**
 * How It Works – Framer‑style, readable, and on‑brand.
 * - Tailwind + shadcn/ui + framer-motion
 * - Uses your existing tokens/classes: bg-card, text-muted, border-hairline
 * - Sections: Hero → Stats → Step Cards → Deep Dive → Timeline → FAQ → CTA
 */
export default function HowItWorks() {
  const container = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 }
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 }
  };

  const steps = [
    {
      title: "Browse & Join a Pool",
      desc: "Find products you want at wholesale prices. Join an active pool with other buyers working toward the same MOQ target.",
      image: "/istockphoto-1365606637-612x612.jpg",
      icon: Users,
      details: [
        "Browse verified supplier products from Alibaba & Made-in-China",
        "See live progress toward MOQ (e.g., 87/100 units pledged)",
        "Lock in your quantity—you only buy what you need"
      ]
    },
    {
      title: "Secure Payment in Escrow",
      desc: "Your payment is held safely in escrow. Money only releases when the pool reaches MOQ and the order is placed.",
      image: "/istockphoto-1197547531-612x612.jpg",
      icon: ShieldCheck,
      details: [
        "100% secure escrow—funds protected until MOQ is met",
        "See all costs upfront: product price + shipping + fees",
        "Full automatic refund if pool doesn't fill within 30 days"
      ]
    },
    {
      title: "Pool Reaches MOQ",
      desc: "When enough buyers join and the MOQ is hit, the pool closes and we place the bulk order with the supplier.",
      image: "/istockphoto-1311600080-612x612.jpg",
      icon: CheckCircle2,
      details: [
        "Pool locks when target is reached—no more changes",
        "We capture payments from escrow and confirm order",
        "You get final confirmation with production timeline"
      ]
    },
    {
      title: "We Order in Bulk",
      desc: "We leverage the group's combined order to negotiate with the factory, ensuring quality and best pricing for everyone.",
      image: "/istockphoto-840610244-612x612.jpg",
      icon: Handshake,
      details: [
        "Single bulk order placed with the supplier at MOQ pricing",
        "Our team handles all negotiations and quality checks",
        "Production begins with confirmed specifications"
      ]
    },
    {
      title: "Direct Delivery to You",
      desc: "Products ship from the factory directly to each buyer's address. You get individual tracking and support throughout.",
      image: "/istockphoto-1299083810-612x612.jpg",
      icon: Truck,
      details: [
        "Factory ships individually to each pool participant",
        "Track your shipment with unique tracking number",
        "Customer support for delivery issues and returns"
      ]
    },
  ];

  const stats = [
    { label: "Active pools", value: "2,847", icon: Package },
    { label: "Avg. savings", value: "23%", icon: TrendingUp },
    { label: "Countries served", value: "47", icon: Globe },
    { label: "Avg. delivery time", value: "14 days", icon: Clock },
  ];

  const faqs = [
    {
      question: "How much can I actually save with MOQ pools?",
      answer: "Savings typically range from 30-60% compared to retail prices. For example, a product that costs $150 retail might be $89 through a pool. The exact savings depend on the MOQ tier and factory pricing structure for each product."
    },
    {
      question: "Is my money safe? What if the pool doesn't fill?",
      answer: "100% safe. Your payment is held in secure escrow and only released when the pool reaches MOQ and the order is placed. If the pool doesn't fill within 30 days, you receive an automatic full refund—no questions asked."
    },
    {
      question: "How long does the whole process take?",
      answer: "Typical timeline: 7-14 days for pool to fill, then 14-21 days for production and shipping. Total: 3-5 weeks from joining to delivery. You can track progress in real-time on your pool's page."
    },
    {
      question: "Can I order just 1 or 2 units?",
      answer: "Yes! That's the entire point. While factories require MOQs of 100+, you can order as few as 1 unit and still get wholesale pricing by joining a pool with other buyers."
    },
    {
      question: "What happens if I need to cancel?",
      answer: "You can cancel anytime before the pool reaches MOQ and locks. Once locked, the order is placed with the supplier and cancellations aren't possible. Always check the pool deadline and progress before joining."
    },
    {
      question: "Who pays for shipping?",
      answer: "Shipping costs are shown upfront when you join a pool. The factory ships directly to each buyer, and you pay your individual shipping cost based on your location and order size."
    },
    {
      question: "What if I receive a damaged or wrong product?",
      answer: "We offer full support for damaged or incorrect items. Contact us within 7 days of delivery with photos, and we'll work with the supplier to resolve it—either through replacement, partial refund, or full refund depending on the issue."
    },
    {
      question: "Do you verify product quality?",
      answer: "Yes. We work with verified suppliers from Alibaba and Made-in-China with established track records. For larger pools, we can arrange pre-shipment inspections. All product details and specs are confirmed before ordering."
    }
  ];

  return (
    <div className="w-full">
      {/* HERO - Streamlined */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[1200px] rounded-full blur-3xl opacity-20 bg-gradient-to-r from-orange-400/40 via-amber-400/40 to-orange-400/40" />
        </div>
        <div className="px-6 md:px-10 xl:px-16 py-16 md:py-24 max-w-6xl mx-auto">
          <motion.div variants={container} initial="hidden" animate="show" transition={{ staggerChildren: 0.08, duration: 0.5, ease: "easeOut" }} className="text-center">
            <motion.div variants={item} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-orange-600 bg-orange-100 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4" aria-hidden />
              How MOQ Pools Work
            </motion.div>
            <motion.h1 variants={item} className="mt-6 font-display text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Buy Wholesale. <br className="hidden md:block" />No Bulk Required.
            </motion.h1>
            <motion.p variants={item} className="mt-6 text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Factories require minimum order quantities (MOQs) of 100+ units to unlock wholesale prices. We pool your order with others, so you get factory pricing while only buying the quantity you need.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* THE PROBLEM & SOLUTION */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.1, duration: 0.5 }} className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* THE PROBLEM */}
            <motion.div variants={item} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 md:p-10 border-2 border-red-100">
              <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">😞</span>
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">The Problem</h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p className="flex items-start gap-3">
                  <span className="text-2xl">🏭</span>
                  <span>Factories require MOQ of <strong>100-1000+ units</strong> for wholesale prices</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <span>Small businesses & individuals can't afford bulk orders</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-2xl">📈</span>
                  <span>Forced to pay <strong>2-3x markup</strong> from retailers & resellers</span>
                </p>
              </div>
            </motion.div>

            {/* THE SOLUTION */}
            <motion.div variants={item} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 md:p-10 border-2 border-emerald-200 shadow-lg">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Our Solution</h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p className="flex items-start gap-3">
                  <span className="text-2xl">👥</span>
                  <span>We <strong>pool multiple buyers</strong> together to reach MOQ</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span>Everyone orders <strong>only what they need</strong> (1-10 units)</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-2xl">💎</span>
                  <span>Everyone gets <strong>factory wholesale pricing</strong></span>
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* VISUAL EXAMPLE */}
          <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-12 bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 rounded-3xl p-8 md:p-12 border-2 border-orange-200">
            <h4 className="text-2xl md:text-3xl font-bold text-center mb-8 text-gray-900">Real Example: Wireless Earbuds</h4>
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="bg-white rounded-2xl p-6 text-center shadow-md">
                <div className="text-4xl mb-3">🔴</div>
                <div className="text-sm text-gray-500 mb-2">Buying Solo</div>
                <div className="text-3xl font-bold text-red-600">$149</div>
                <div className="text-sm text-gray-600 mt-2">Retail price per unit</div>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="w-12 h-12 text-orange-500 hidden md:block" />
                <span className="md:hidden text-4xl">↓</span>
              </div>
              
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-green-400">
                <div className="text-4xl mb-3">🟢</div>
                <div className="text-sm text-gray-500 mb-2">With MOQ Pool (100 buyers)</div>
                <div className="text-3xl font-bold text-green-600">$89</div>
                <div className="text-sm text-gray-600 mt-2">Factory wholesale price</div>
                <div className="mt-4 inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold">
                  Save $60 (40%)
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STEP CARDS */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="w-full">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }} className="text-center mb-16">
            <motion.h2 variants={item} className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              How it works in 5 steps
            </motion.h2>
            <motion.p variants={item} className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From browsing to delivery—we make group buying simple, secure, and transparent.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} transition={{ staggerChildren: 0.12 }} className="space-y-8">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <motion.div key={i} variants={item} className="relative">
                  {/* Connector Line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute left-[47px] top-[80px] w-0.5 h-[calc(100%+2rem)] bg-gradient-to-b from-orange-300 to-orange-100 z-0"></div>
                  )}

                  {/* Step Card */}
                  <div className="relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-gray-100 hover:border-orange-200 group">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8">
                      {/* Left Side - Number & Icon */}
                      <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3">
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <span className="text-3xl font-bold text-white">{i + 1}</span>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                          <StepIcon className="w-7 h-7 text-orange-600" />
                        </div>
                      </div>

                      {/* Right Side - Content */}
                      <div className="flex-1">
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900 group-hover:text-orange-600 transition-colors">
                          {step.title}
                        </h3>
                        <p className="text-lg md:text-xl text-gray-600 mb-5 leading-relaxed">
                          {step.desc}
                        </p>
                        
                        {/* Details List */}
                        <ul className="space-y-3">
                          {step.details.map((detail, j) => (
                            <li key={j} className="flex items-start gap-3 text-base md:text-lg text-gray-700">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </section>

      {/* KEY BENEFITS */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.1, duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={item} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-100">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-2xl mb-3">Wholesale Pricing</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Access factory-direct prices typically reserved for bulk orders of 100+ units, by pooling with other buyers.
              </p>
            </motion.div>

            <motion.div variants={item} className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-2xl mb-3">Zero Risk</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Payments held in escrow until MOQ is reached. Automatic full refunds if the pool doesn't fill within 30 days.
              </p>
            </motion.div>

            <motion.div variants={item} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-2xl mb-3">Full Service</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                We handle negotiations, quality control, and coordinate shipping directly to each buyer—you just wait for delivery.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }} className="text-center mb-16">
            <motion.h2 variants={item} className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Your order timeline
            </motion.h2>
            <motion.p variants={item} className="text-xl text-gray-600 max-w-2xl mx-auto">
              From joining a pool to receiving your order—here's what to expect.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }} className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                { day: "Day 1-7", title: "Pool Filling Phase", desc: "Buyers join the pool and it grows towards the MOQ target. Track real-time progress on the pool page." },
                { day: "Day 7-10", title: "MOQ Reached & Locked", desc: "Pool closes when MOQ is met. We begin processing the bulk order with the supplier." },
                { day: "Day 10-14", title: "Factory Production", desc: "Manufacturing starts with your confirmed specifications and our quality oversight." },
                { day: "Day 14-21", title: "Quality Control", desc: "We inspect product samples and prepare individual shipments for all buyers." },
                { day: "Day 21-28", title: "Delivery", desc: "Your order ships directly to you with tracking. Goods typically arrive within 3-7 business days." },
              ].map((phase, i) => (
                <motion.div key={i} variants={item} className="flex items-start gap-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="font-bold text-xl text-gray-900">{phase.title}</h3>
                      <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full w-fit">{phase.day}</span>
                    </div>
                    <p className="text-base text-gray-600 leading-relaxed">{phase.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }} className="text-center mb-12">
            <motion.h2 variants={item} className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Common Questions
            </motion.h2>
            <motion.p variants={item} className="text-xl text-gray-600">
              Everything you need to know about MOQ pooling.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }}>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-gray-50 rounded-xl border border-gray-200 px-6 py-2">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:text-orange-600 transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-gray-600 leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-10 xl:px-16 py-16 md:py-20 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.08, duration: 0.5 }}>
            <motion.h2 variants={item} className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Ready to unlock wholesale pricing?
            </motion.h2>
            <motion.p variants={item} className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Browse active pools and start saving today—no minimum purchase required.
            </motion.p>
            <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/products" className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-600 font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Browse Active Pools
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a href="/" className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-300">
                Back to Home
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}