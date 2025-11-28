import React from "react";
import Image from "next/image";
// Static imports for partner logos (kept outside public; Next.js will bundle)
import stripeLogo from "../../../company logos/stripe.png";

export const metadata = {
  title: "Payment Protection & Escrow | MOQ Pools",
  description: "How payments, refunds, and escrow work on MOQ Pools. Learn when you're charged, how refunds are handled if MOQ isn't met, and our buyer protection promise.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-12">
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-6">{title}</h2>
      <div className="text-base leading-7 text-gray-700">{children}</div>
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

      <Section id="how-it-works" title="How it works (step-by-step)">
        <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Step</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Description</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">1. Join a Group Buy</td>
                <td className="px-6 py-4 text-gray-700">You commit to purchase but no payment is charged yet.</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 border-2 border-gray-200 px-3 py-1 text-sm font-medium text-gray-700">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Pending
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">2. MOQ Reached</td>
                <td className="px-6 py-4 text-gray-700">Once the group hits the minimum order quantity, your payment is securely captured through our partner payment gateway (Stripe/PayPal).</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 border-2 border-amber-200 px-3 py-1 text-sm font-medium text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Escrow Hold
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">3. Supplier Confirms Order</td>
                <td className="px-6 py-4 text-gray-700">Funds remain held in escrow until the supplier confirms dispatch to our fulfillment center.</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 border-2 border-amber-200 px-3 py-1 text-sm font-medium text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Escrow Hold
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">4. Shipment & Delivery</td>
                <td className="px-6 py-4 text-gray-700">After your item ships, funds are released to the supplier.</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border-2 border-emerald-200 px-3 py-1 text-sm font-medium text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-4 text-sm text-blue-700">
          <span className="font-semibold">💡 Key Point:</span> This prevents suppliers from taking payment before the MOQ is verified.
        </div>
        <div className="mt-2 text-sm text-neutral-500">
          Note: In some regions, we may place an authorization at checkout and only capture when MOQ is reached.
        </div>
      </Section>

      <Section id="moq-not-met" title="If MOQ isn't met">
        <div className="space-y-6">
          <p className="text-lg text-gray-700">If your group doesn't reach the required MOQ before the deadline:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <span className="text-3xl">💸</span>
              <div>
                <span className="font-semibold text-gray-900">You are not charged.</span>
                <p className="mt-1 text-sm text-gray-600">Your payment method is never billed.</p>
              </div>
            </li>
            <li className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
              <span className="text-3xl">⏱️</span>
              <div>
                <span className="font-semibold text-gray-900">Pre-authorizations voided automatically.</span>
                <p className="mt-1 text-sm text-gray-600">Any temporary hold disappears within 1-3 business days.</p>
              </div>
            </li>
            <li className="flex items-start gap-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4 shadow-sm">
              <span className="text-3xl">💳</span>
              <div>
                <span className="font-semibold text-gray-900">Funds never leave your account.</span>
                <p className="mt-1 text-sm text-gray-600">Your bank account or card balance remains untouched.</p>
              </div>
            </li>
          </ul>
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-semibold text-gray-900">For prepaid payment methods</p>
                <p className="mt-2 text-gray-700">
                  (like PayNow or manual transfer): we'll automatically refund your payment to the original method within 3-5 business days.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-lg">
            <div className="text-lg font-bold text-gray-900 mb-3">❓ FAQ</div>
            <div className="space-y-3">
              <div>
                <div className="font-semibold text-gray-900">Q: I see a "pending" charge - is that normal?</div>
                <div className="mt-1 text-gray-700">A: Yes. It's a temporary authorization by Stripe/PayPal. It disappears automatically if the group doesn't complete.</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="buyer-protection" title="Buyer Protection Promise: your rights & our guarantee">
        <div className="space-y-6">
          <p className="text-lg">
            We stand between your payment and the supplier until your order is on its way. If something isn't right, we'll make it
            right - via replacement, re-ship, or refund per our policies.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🛡️</span>
                <div className="font-bold text-lg text-gray-900">You're protected if...</div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-gray-700">MOQ isn't met by the deadline</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-gray-700">Supplier doesn't ship within the stated window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-gray-700">Package is lost, severely delayed, or damaged</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-gray-700">Item is not as described (materially different)</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔧</span>
                <div className="font-bold text-lg text-gray-900">How we resolve</div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">→</span>
                  <span className="text-gray-700">Contact supplier, confirm remedy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">→</span>
                  <span className="text-gray-700">Re-ship or replacement where possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">→</span>
                  <span className="text-gray-700">Partial or full refund depending on outcome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">→</span>
                  <span className="text-gray-700">Escalation path for formal disputes</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-4 text-sm text-amber-800">
            <span className="font-semibold">⚠️ Important:</span> Keep packaging and take photos for damage claims. Report issues promptly so we can help.
          </div>
        </div>
      </Section>

      <Section id="partners" title="Our payment partners">
        <div className="flex flex-wrap items-center gap-6">
          <Image src={stripeLogo} alt="Stripe" width={120} height={42} className="h-10 w-auto hover:scale-110 transition-all duration-300" />
        </div>
        <div className="mt-3 text-sm text-neutral-500">Logos shown are for identification only. Payment methods vary by region.</div>
      </Section>

      <Section id="timeline" title="Escrow timeline: when funds move and why">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg group hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3">📅</div>
            <div className="text-lg font-bold text-gray-900 mb-2">Day 0 - MOQ reached</div>
            <div className="text-gray-700">Your card is charged and funds move into escrow. We email your receipt.</div>
          </div>
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg group hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3">📦</div>
            <div className="text-lg font-bold text-gray-900 mb-2">Prep & handoff</div>
            <div className="text-gray-700">Supplier prepares order. We verify pickup and tracking before releasing supplier funds.</div>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg group hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3">🚚</div>
            <div className="text-lg font-bold text-gray-900 mb-2">Delivery window</div>
            <div className="text-gray-700">You're covered until delivery. For issues, contact support from your account.</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-neutral-500">
          We may hold a portion of funds until delivery is confirmed to deter chargebacks and ensure fulfillment quality.
        </div>
      </Section>

      <Section id="help" title="Need help? Contact support / dispute process">
        <p className="text-lg">
          For any payment or delivery concern, open a support request from your account. We'll respond by email and keep you
          updated.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/account/messages" className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-base font-medium text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">Contact support</a>
          <a href="/faq" className="rounded-xl border-2 border-orange-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all">Read FAQ</a>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          For formal disputes, we follow our Terms and your payment network's rules. This page is for information only and does
          not modify our Terms of Service.
        </p>
      </Section>
      </div>
    </div>
  );
}
