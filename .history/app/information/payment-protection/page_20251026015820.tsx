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
              <div className="flex items-center gap-2 text-neutral-900">
                <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white">🔒</span>
                <h1 className="text-2xl font-bold tracking-tight">Buy Together. Pay Safely.</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-neutral-700">
                Your payment is held securely in escrow until your group order reaches its MOQ and is confirmed by the supplier.
                No MOQ = No charge. Simple, safe, and transparent.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Trusted by
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5">Stripe</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5">PayPal</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5">PayNow</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  PCI‑DSS Level 1 certified processors
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
