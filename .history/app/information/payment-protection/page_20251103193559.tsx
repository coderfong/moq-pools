import React from "react";
import Image from "next/image";
// Static imports for partner logos (kept outside public; Next.js will bundle)
import stripeLogo from "../../../company logos/stripe.png";
import paypalLogo from "../../../company logos/paypal.png";

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
    <div className="relative min-h-screen bg-gradient-to-b from-orange-50/30 via-white to-white">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 opacity-20 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 opacity-15 blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 opacity-10 blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative pb-12">
      {/* Hero / Intro */}
      <div className="border-b-2 border-orange-200/50 bg-gradient-to-b from-white via-orange-50/30 to-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 text-2xl">🔒</span>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">Buy Together. Pay Safely.</h1>
              </div>
              <p className="mt-4 max-w-3xl text-lg text-gray-700 leading-relaxed">
                Your payment is held securely in escrow until your group order reaches its MOQ and is confirmed by the supplier.
                <span className="font-semibold text-orange-600"> No MOQ = No charge.</span> Simple, safe, and transparent.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">Trusted by</span>
                  <span className="inline-flex items-center gap-2">
                    <Image src={stripeLogo} alt="Stripe" width={60} height={22} className="h-5 w-auto" />
                    <Image src={paypalLogo} alt="PayPal" width={60} height={22} className="h-5 w-auto" />
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 shadow-lg shadow-emerald-500/30">
                  <span className="inline-block h-2 w-2 rounded-full bg-white" />
                  <span className="text-sm font-semibold">PCI-DSS Level 1 certified</span>
                </span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-4 shadow-lg">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-sm font-medium text-gray-700">
                  Payments held in escrow<br />
                  <span className="text-emerald-600">until supplier ships</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section id="how-it-works" title="How it works (step‑by‑step)">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Step</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              <tr>
                <td className="px-3 py-2">1. Join a Group Buy</td>
                <td className="px-3 py-2 text-neutral-700">You commit to purchase but no payment is charged yet.</td>
                <td className="px-3 py-2"><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">Pending</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2">2. MOQ Reached</td>
                <td className="px-3 py-2 text-neutral-700">Once the group hits the minimum order quantity, your payment is securely captured through our partner payment gateway (Stripe/PayPal).</td>
                <td className="px-3 py-2"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">Escrow Hold</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2">3. Supplier Confirms Order</td>
                <td className="px-3 py-2 text-neutral-700">Funds remain held in escrow until the supplier confirms dispatch to our fulfillment center.</td>
                <td className="px-3 py-2"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">Escrow Hold</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2">4. Shipment & Delivery</td>
                <td className="px-3 py-2 text-neutral-700">After your item ships, funds are released to the supplier.</td>
                <td className="px-3 py-2"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs">Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-neutral-500">This prevents suppliers from taking payment before the MOQ is verified.</div>
        <div className="mt-1 text-xs text-neutral-500">Note: In some regions, we may place an authorization at checkout and only capture when MOQ is reached.</div>
      </Section>

      <Section id="moq-not-met" title="If MOQ isn’t met">
        <div className="space-y-3">
          <p className="text-neutral-700">If your group doesn’t reach the required MOQ before the deadline:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="mr-1">💸</span>You are not charged.</li>
            <li><span className="mr-1">⏱️</span>Any pre‑authorization (temporary hold) is automatically voided within 1–3 business days.</li>
            <li><span className="mr-1">💳</span>Funds never leave your bank account or card balance.</li>
          </ul>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
            For prepaid payment methods (like PayNow or manual transfer): we’ll automatically refund your payment to the original method within 3–5 business days.
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="text-sm font-medium text-neutral-900">FAQ</div>
            <div className="mt-2 text-sm">
              <div className="font-medium">Q: I see a “pending” charge — is that normal?</div>
              <div className="text-neutral-700">A: Yes. It’s a temporary authorization by Stripe/PayPal. It disappears automatically if the group doesn’t complete.</div>
            </div>
          </div>
        </div>
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
        <div className="flex flex-wrap items-center gap-4">
          <Image src={stripeLogo} alt="Stripe" width={84} height={28} className="h-7 w-auto" />
          <Image src={paypalLogo} alt="PayPal" width={84} height={28} className="h-7 w-auto" />
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
          For any payment or delivery concern, open a support request from your account. We'll respond by email and keep you
          updated.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/account/messages" className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:shadow-lg hover:scale-105 transition-all duration-300">Contact support</a>
          <a href="/faq" className="rounded-lg border-2 border-orange-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all">Read FAQ</a>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          For formal disputes, we follow our Terms and your payment network's rules. This page is for information only and does
          not modify our Terms of Service.
        </p>
      </Section>
      </div>
    </div>
  );
}
