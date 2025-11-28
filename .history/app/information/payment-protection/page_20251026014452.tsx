import React from "react";

export const metadata = {
  title: "Payment Protection & Escrow | MOQ Pools",
  description: "How payments, refunds, and escrow work on MOQ Pools. Learn when you’re charged, how refunds are handled if MOQ isn’t met, and our buyer protection promise.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-8">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  );
}

export default function PaymentProtectionPage() {
  return (
    <div className="pb-12">
      {/* Hero / Intro */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:py-12">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Payment Protection / Escrow Information</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-700">
                Secure group buys, guaranteed. This page explains how we handle your money safely, when you’re charged, what
                happens if MOQ isn’t reached, and how our buyer protection works from payment to delivery.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  SSL encryption
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  PCI-compliant processors
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Dispute assistance
                </span>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Payments held in escrow until supplier ships
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section id="how-it-works" title="How it works: payment flow">
        <ol className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              k: 1,
              t: "Join group buy",
              d: "Place your order. Your payment method is verified and ready. We’ll only charge once the group reaches MOQ.",
            },
            {
              k: 2,
              t: "MOQ reached → charge",
              d: "When MOQ is met, your card is charged. Funds are held in escrow with our payment partner.",
            },
            {
              k: 3,
              t: "Prepare & ship",
              d: "Supplier prepares your order. We release funds to the supplier only when shipping is confirmed.",
            },
            {
              k: 4,
              t: "Delivery & protection",
              d: "You’re protected until delivery. If anything goes wrong, we’ll help resolve or refund per policy.",
            },
          ].map((s) => (
            <li key={s.k} className="relative rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium text-neutral-500">Step {s.k}</div>
              <div className="mt-1 font-semibold text-neutral-900">{s.t}</div>
              <div className="mt-1 text-sm text-neutral-700">{s.d}</div>
            </li>
          ))}
        </ol>
        <div className="mt-3 text-xs text-neutral-500">
          Note: In some regions, we may place an authorization at checkout and only capture when MOQ is reached.
        </div>
      </Section>

      <Section id="moq-not-met" title="If MOQ isn’t met: our refund / no-charge policy">
        <ul className="list-disc space-y-2 pl-5">
          <li>You will not be charged if the group doesn’t reach MOQ by the deadline. Any pending authorization is released.</li>
          <li>If a charge occurred in error, we issue a full refund automatically.</li>
          <li>You’ll receive an email confirmation when the group closes and, if applicable, when a refund is processed.</li>
        </ul>
      </Section>

      <Section id="buyer-protection" title="Buyer Protection Promise: your rights & our guarantee">
        <div className="space-y-2">
          <p>
            We stand between your payment and the supplier until your order is on its way. If something isn’t right, we’ll make it
            right — via replacement, re‑ship, or refund per our policies.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">You’re protected if…</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>MOQ isn’t met by the deadline</li>
                <li>Supplier doesn’t ship within the stated window</li>
                <li>Package is lost, severely delayed, or damaged</li>
                <li>Item is not as described (materially different)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">How we resolve</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>Contact supplier, confirm remedy</li>
                <li>Re‑ship or replacement where possible</li>
                <li>Partial or full refund depending on outcome</li>
                <li>Escalation path for formal disputes</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Important: Keep packaging and take photos for damage claims. Report issues promptly so we can help.
          </p>
        </div>
      </Section>

      <Section id="partners" title="Our payment partners">
        <div className="flex flex-wrap items-center gap-2">
          {["Stripe", "PayPal", "PayNow"].map((name) => (
            <span key={name} className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800">
              {name}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-neutral-500">Logos shown are for identification only. Payment methods vary by region.</div>
      </Section>

      <Section id="timeline" title="Escrow timeline: when funds move and why">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              t: "Day 0 — MOQ reached",
              d: "Your card is charged and funds move into escrow. We email your receipt.",
            },
            {
              t: "Prep & handoff",
              d: "Supplier prepares order. We verify pickup and tracking before releasing supplier funds.",
            },
            {
              t: "Delivery window",
              d: "You’re covered until delivery. For issues, contact support from your account.",
            },
          ].map((x, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">{x.t}</div>
              <div className="mt-1 text-sm text-neutral-700">{x.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          We may hold a portion of funds until delivery is confirmed to deter chargebacks and ensure fulfillment quality.
        </div>
      </Section>

      <Section id="help" title="Need help? Contact support / dispute process">
        <p>
          For any payment or delivery concern, open a support request from your account. We’ll respond by email and keep you
          updated.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/account/messages" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">Contact support</a>
          <a href="/faq" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Read FAQ</a>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          For formal disputes, we follow our Terms and your payment network’s rules. This page is for information only and does
          not modify our Terms of Service.
        </p>
      </Section>
    </div>
  );
}
