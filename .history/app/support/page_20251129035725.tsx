import React from "react";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Contact Us / Support | MOQ Pools",
  description:
    "We're here to help with orders, shipping, pooling, or payments. Message us anytime - replies within 24 hours (Mon-Fri, 9 AM-6 PM SGT).",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-8">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  );
}

export default function SupportPage() {
  const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const email = "chaibotsg@gmail.com";
  const phone = "+65 9479 9717";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Us",
    url: `${siteUrl}/support`,
    mainEntity: {
      "@type": "Organization",
      name: "PoolBuy",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email,
        telephone: "+6594799717",
        availableLanguage: ["en"],
        areaServed: ["US", "EU", "SEA", "APAC"],
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday"
          ],
          opens: "09:00",
          closes: "18:00",
        },
      },
    },
  };
  return (
    <div className="pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-orange-200/50 bg-gradient-to-b from-orange-50 via-white to-amber-50/50">
        {/* Animated blobs */}
        <div className="absolute left-10 top-10 h-64 w-64 animate-blob rounded-full bg-orange-200 opacity-30 mix-blend-multiply blur-3xl" />
        <div className="animation-delay-2000 absolute right-10 top-20 h-64 w-64 animate-blob rounded-full bg-amber-200 opacity-30 mix-blend-multiply blur-3xl" />
        <div className="animation-delay-4000 absolute bottom-10 left-1/2 h-64 w-64 animate-blob rounded-full bg-pink-200 opacity-30 mix-blend-multiply blur-3xl" />
        
        <div className="relative mx-auto w-full max-w-[1000px] px-4 py-12 sm:py-16">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white inline-flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-all duration-300" aria-hidden>💌</div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">Contact Us / Support</h1>
                <p className="mt-3 max-w-2xl text-base text-gray-700">
                  We're here to help - before or after your order. Whether you need assistance with shipping, MOQ pooling,
                  or payment status, our support team is just a message away.
                </p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-2 border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Replies within 24 hours (Mon-Fri, 9 AM-6 PM SGT)
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <a href={`tel:+6594799717`} className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">Call us</a>
              <a href={`mailto:${email}`} className="rounded-full border-2 border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">Email</a>
            </div>
          </div>
        </div>
      </div>

      {/* Body: 2-column layout */}
      <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-3 sm:py-10">
        <div className="sm:col-span-2">
          <div className="group rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-white p-6 hover:shadow-xl hover:border-orange-300 transition-all duration-300">
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">Send us a message</h2>
            <p className="mt-2 text-sm text-gray-700">We'll route your request to the right team and reply via email.</p>
            <div className="mt-4">
              <ContactForm />
            </div>
          </div>
        </div>
        <div className="sm:col-span-1">
          <div className="space-y-4">
            {/* Contact methods */}
            <div className="rounded-2xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-white p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
              <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="text-xl">📱</span>
                Contact methods
              </div>
              <div className="mt-3 grid gap-2">
                <a href={`/account/messages`} className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300 text-center">Message us on PoolBuy</a>
                <a href={`mailto:${email}`} className="rounded-xl border-2 border-orange-200 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 text-center">Email: {email}</a>
                <a href={`tel:+6594799717`} className="rounded-xl border-2 border-orange-200 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 text-center">Phone: {phone}</a>
              </div>
              <p className="mt-3 text-xs text-gray-600">For urgent order issues, include your Order ID.</p>
            </div>

            {/* Business info */}
            <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-white p-5 hover:shadow-xl hover:border-orange-300 transition-all duration-300">
              <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="text-xl">🏢</span>
                Business info
              </div>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <p className="flex items-center gap-2">
                  <span className="text-base">🇸🇬</span>
                  Registered in Singapore
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-base">🕒</span>
                  Mon-Fri, 9 AM-6 PM (SGT)
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  Singapore (by appointment)
                </p>
              </div>
            </div>

            {/* Hours / SLA */}
            <div className="rounded-2xl border-2 border-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-white p-5 hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
              <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="text-xl">⏱️</span>
                Response time
              </div>
              <div className="mt-3 text-sm text-gray-700">
                Replies within <span className="font-bold text-emerald-700">24 hours</span>. Peak seasons may take slightly longer - thanks for your patience.
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-amber-50/30 to-white p-5 hover:shadow-xl hover:border-orange-300 transition-all duration-300">
              <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="text-xl">❓</span>
                FAQs / Quick help
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <Link className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors" href="/how-it-works">How pooling works</Link>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <Link className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors" href="/information/shipping-returns">Shipping & Returns Policy</Link>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <Link className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors" href="/information/payment-protection">Payment Protection</Link>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <Link className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors" href="/account/orders/tracking">Track your order</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
