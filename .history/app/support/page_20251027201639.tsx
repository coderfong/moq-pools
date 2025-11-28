import React from "react";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";

export const metadata = {
  title: "Contact Us / Support | MOQ Pools",
  description:
    "We’re here to help with orders, shipping, pooling, or payments. Message us anytime — replies within 24 hours (Mon–Fri, 9 AM–6 PM SGT).",
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
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:py-14">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-neutral-900 text-white inline-flex items-center justify-center text-xl" aria-hidden>💌</div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Contact Us / Support</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-700">
                We’re here to help — before or after your order. Whether you need assistance with shipping, MOQ pooling,
                or payment status, our support team is just a message away.
              </p>
              <p className="mt-1 text-xs text-neutral-600">Replies within 24 hours (Mon–Fri, 9 AM–6 PM SGT)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body: 2-column layout */}
      <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-6 px-4 py-6 sm:grid-cols-3 sm:py-8">
        <div className="sm:col-span-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-base font-semibold text-neutral-900">Send us a message</h2>
            <p className="mt-1 text-sm text-neutral-600">We’ll route your request to the right team and reply via email.</p>
            <div className="mt-3">
              <ContactForm />
            </div>
          </div>
        </div>
        <div className="sm:col-span-1">
          <div className="space-y-4">
            {/* Contact methods */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">Contact methods</div>
              <div className="mt-2 grid gap-2">
                <a href={`/account/messages`} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">Message us on PoolBuy</a>
                <a href={`mailto:${email}`} className="rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Email: {email}</a>
                <a href={`tel:+6594799717`} className="rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Phone: {phone}</a>
              </div>
              <p className="mt-2 text-xs text-neutral-600">For urgent order issues, include your Order ID.</p>
            </div>

            {/* Business info */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">Business info</div>
              <div className="mt-2 text-sm text-neutral-700 space-y-1">
                <p>Registered in Singapore</p>
                <p>Office hours: Mon–Fri, 9 AM–6 PM (SGT)</p>
                <p>Address: Singapore (by appointment)</p>
              </div>
            </div>

            {/* Hours / SLA */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">Response time</div>
              <div className="mt-2 text-sm text-neutral-700">
                Replies within 24 hours. Peak seasons may take slightly longer — thanks for your patience.
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">FAQs / Quick help</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li><Link className="underline" href="/how-it-works">How pooling works</Link></li>
                <li><Link className="underline" href="/information/shipping-returns">Shipping & Returns Policy</Link></li>
                <li><Link className="underline" href="/information/payment-protection">Payment Protection</Link></li>
                <li><Link className="underline" href="/account/orders/tracking">Track your order</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
