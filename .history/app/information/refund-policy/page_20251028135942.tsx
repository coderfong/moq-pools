import React from "react";

export const metadata = {
  title: "Refund Policy | PoolBuy",
  description: "Refunds aligned with group-buy (MOQ) escrow model: when you’re eligible and how refunds are processed.",
};

export default function RefundPolicyPage() {
  const email = "chaibotsg@gmail.com";
  const updated = "October 28, 2025";
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 py-8 text-neutral-900">
      <h1 className="text-3xl font-bold tracking-tight">Refund Policy</h1>
      <p className="mt-1 text-sm text-neutral-600">Last updated: {updated}</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-neutral-800">
        <section>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="mt-2">Our refund policy is designed for group-buy (MOQ pooling). Payments may be pre-authorized until a pool reaches its MOQ. When a pool reaches MOQ, payment is captured and the order proceeds to production or fulfillment.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Refund Eligibility</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><span className="font-medium">MOQ not reached:</span> If the MOQ deadline passes without reaching the target, your pre-authorization is released or your payment is voided; no charge applies.</li>
            <li><span className="font-medium">Order canceled before supplier confirmation:</span> If the order is canceled before supplier confirmation, a full refund is issued.</li>
            <li><span className="font-medium">Lost or damaged in transit:</span> If your item is lost or arrives damaged, we will repair, replace, or refund according to shipping insurance and our assessment.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Non-Refundable Cases</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Once production has started or the order has shipped (unless covered by lost/damaged or consumer law protections).</li>
            <li>Buyer remorse, incorrect specs ordered, or change of mind after MOQ capture.</li>
            <li>Custom or personalized items where work has begun.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How Refunds Are Processed</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Refunds are processed to your original payment method via Stripe or PayPal.</li>
            <li>Processing times vary by bank/issuer (typically 5–10 business days once approved).</li>
            <li>For partial shipments, we may issue partial refunds or adjustments case-by-case.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How to Request a Refund</h2>
          <p className="mt-2">Contact Support at <a className="underline" href={`mailto:${email}`}>{email}</a> with your Order ID and details. We’ll review and respond within a reasonable timeframe.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Legal</h2>
          <p className="mt-2">This policy is intended to comply with applicable consumer protections. Local laws may grant you additional rights that supersede this policy where applicable.</p>
        </section>
      </div>
    </section>
  );
}
