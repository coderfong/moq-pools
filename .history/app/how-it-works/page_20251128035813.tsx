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
      title: "Join a pool",
      desc: "Browse listings, select what you want, and join an active MOQ pool. See real-time progress and pricing tiers.",
      image: "/istockphoto-1365606637-612x612.jpg",
      details: [
        "Live pool status with units pledged and target progress",
        "Complete product details including MOQs and lead times",
        "Edit your allocation until payment is complete"
      ]
    },
    {
      title: "Pay & reserve",
      desc: "Secure your spot with payment held in escrow. Funds release only when the pool fills successfully.",
      image: "/istockphoto-1197547531-612x612.jpg",
      details: [
        "Safe escrow protection until MOQ is reached",
        "Transparent fees and taxes shown upfront",
        "Cancel anytime before the pool locks"
      ]
    },
    {
      title: "Pool fills (MOQ met)",
      desc: "Once the target is reached, the pool locks and we confirm your final pricing and timeline.",
      image: "/istockphoto-1311600080-612x612.jpg",
      details: [
        "Allocations freeze when MOQ is reached",
        "Updated production and shipping ETAs provided",
        "Automatic refunds if MOQ isn't met by deadline"
      ]
    },
    {
      title: "We negotiate & order",
      desc: "We place the bulk order immediately and negotiate the best factory pricing for the entire group.",
      image: "/istockphoto-840610244-612x612.jpg",
      details: [
        "Volume leverage through coordinated purchasing",
        "Quality checks and specifications confirmed",
        "Shipping labels prepared for each buyer"
      ]
    },
    {
      title: "Supplier ships to each buyer",
      desc: "Goods ship directly from the factory to each buyer with individual tracking and delivery.",
      image: "/istockphoto-1299083810-612x612.jpg",
      details: [
        "Individual tracking numbers for each shipment",
        "Duties and taxes handled per destination",
        "Full post-delivery support and returns"
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
      question: "How does MOQ pooling work?",
      answer: "We collect orders from multiple buyers until we reach the factory's minimum order quantity. Once met, we place a bulk order and distribute the goods to each participant."
    },
    {
      question: "Is my payment safe?",
      answer: "Yes, all payments are held in secure escrow until the MOQ is met and the order is confirmed. If the pool doesn't fill, you get a full refund."
    },
    {
      question: "How long does it take?",
      answer: "Most pools fill within 7-14 days. Once filled, manufacturing and shipping typically takes 2-4 weeks depending on the product and location."
    },
    {
      question: "What if the pool doesn't fill?",
      answer: "If a pool doesn't reach MOQ within 30 days, all payments are refunded automatically. You can also extend the pool or join a similar one."
    },
    {
      question: "Do you handle customs and duties?",
      answer: "We provide guidance on customs requirements, but duties and taxes are the buyer's responsibility. We ensure all documentation is provided for smooth customs clearance."
    }
  ];

  return (
    <div className="w-full">
      {/* HERO - Streamlined */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[1200px] rounded-full blur-3xl opacity-20 bg-gradient-to-r from-orange-400/40 via-amber-400/40 to-orange-400/40" />
        </div>
        <div className="px-6 md:px-10 xl:px-16 py-16 md:py-24 max-w-5xl mx-auto">
          <motion.div variants={container} initial="hidden" animate="show" transition={{ staggerChildren: 0.08, duration: 0.5, ease: "easeOut" }} className="text-center">
            <motion.div variants={item} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-orange-600 bg-orange-100 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4" aria-hidden />
              How MOQ Pools Work
            </motion.div>
            <motion.h1 variants={item} className="mt-6 font-display text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Group buying, simplified.
            </motion.h1>
            <motion.p variants={item} className="mt-6 text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We combine orders from multiple buyers to reach factory MOQs, unlocking wholesale pricing for everyone—without the bulk commitment.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* STEP CARDS */}
      <section className="px-6 md:px-10 xl:px-16 py-14 md:py-20 bg-muted/30">
        <div className="w-full">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="text-center mb-12 md:mb-16">
            <motion.h2 variants={item} className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              5 simple steps to better pricing
            </motion.h2>
            <motion.p variants={item} className="mt-3 text-muted max-w-2xl mx-auto">
              Pool demand with other buyers to unlock genuine factory price breaks—transparent, coordinated, and efficient.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <motion.li key={i} variants={item} className="relative group list-none">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-10 text-muted/60">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}

                <Card className="relative rounded-2xl bg-card text-card-foreground border-hairline p-6 h-full shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/15 text-primary font-semibold text-sm">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center justify-center w-full mb-4">
                    <div className="w-full max-w-sm h-48 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center">
                      <img 
                        src={step.image} 
                        alt={`${step.title} illustration`} 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  </div>

                  <h3 className="font-semibold text-2xl mb-1 text-center">{step.title}</h3>
                  <p className="text-lg text-muted mb-4">{step.desc}</p>
                  
                  <ul className="text-base text-muted space-y-2">
                    {step.details.map((detail, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.li>
            ))}
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
      <section className="px-6 md:px-10 xl:px-16 py-12 md:py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.06, duration: 0.4, ease: "easeOut" }} className="text-center mb-12">
            <motion.h2 variants={item} transition={{ duration: 0.4, ease: "easeOut" }} className="font-display text-2xl md:text-4xl font-extrabold tracking-tight">
              What happens next
            </motion.h2>
            <motion.p variants={item} transition={{ duration: 0.4, ease: "easeOut" }} className="mt-3 text-muted max-w-2xl mx-auto">
              A typical order timeline from pool creation to delivery.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.06, duration: 0.4, ease: "easeOut" }} className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {[
                { day: "Day 1-7", title: "Pool filling", desc: "Buyers join and the pool grows towards MOQ." },
                { day: "Day 7-10", title: "MOQ reached", desc: "Pool locks in and we begin order processing." },
                { day: "Day 10-14", title: "Factory production", desc: "Manufacturing begins with confirmed specifications." },
                { day: "Day 14-21", title: "Quality control", desc: "We inspect samples and prepare for shipment." },
                { day: "Day 21-28", title: "Shipping", desc: "Goods ship and arrive at your doorstep." },
              ].map((phase, i) => (
                <motion.div key={i} variants={item} transition={{ duration: 0.4, ease: "easeOut" }} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{phase.title}</h3>
                      <span className="text-xs text-muted bg-muted px-2 py-1 rounded-full">{phase.day}</span>
                    </div>
                    <p className="text-sm text-muted">{phase.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-10 xl:px-16 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.06, duration: 0.4, ease: "easeOut" }} className="text-center mb-12">
            <motion.h2 variants={item} transition={{ duration: 0.4, ease: "easeOut" }} className="font-display text-2xl md:text-4xl font-extrabold tracking-tight">
              Frequently asked questions
            </motion.h2>
            <motion.p variants={item} transition={{ duration: 0.4, ease: "easeOut" }} className="mt-3 text-muted">
              Everything you need to know about MOQ pooling.
            </motion.p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} transition={{ staggerChildren: 0.06, duration: 0.4, ease: "easeOut" }} className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
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