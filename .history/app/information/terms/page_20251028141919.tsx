import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | MOQ Pools",
  description: "Terms governing use of the MOQ Pools platform, group orders, payments, shipping, and refunds.",
};

export default function TermsPage() {
  const email = "support@moqmarket.com";
  const updated = "October 2025";
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 py-8 text-neutral-900">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-sm text-neutral-600">Last updated: {updated}</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-neutral-800">
        <section>
          <h2 className="text-lg font-semibold">Introduction</h2>
          <p className="mt-2">By accessing or using MOQ Pools (the "Service"), you agree to these Terms. If you do not agree, please do not use the Service.</p>
          <p className="mt-2 text-sm text-neutral-700">Related policies: <Link className="underline" href="/refund-policy">Refund Policy</Link> · <Link className="underline" href="/shipping">Shipping Policy</Link> · <Link className="underline" href="/privacy">Privacy Policy</Link></p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Eligibility & Accounts</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>You must be at least 18 years old to use the Service.</li>
            <li>You are responsible for your account credentials and all activity under your account.</li>
            <li>Provide accurate information and keep it up to date.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Buying & Group Orders (MOQ Pooling)</h2>
          <p className="mt-2">When you join a group order, your payment authorization may be placed on hold until the group reaches the Minimum Order Quantity (MOQ). Once the MOQ is reached, the payment is captured and the order proceeds to fulfillment. If the MOQ is not reached by the deadline, the authorization is released or the order is canceled without capture.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Payments</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Payments are securely processed by Stripe and/or PayPal. We do not store full card details.</li>
            <li>Pre-authorizations may expire automatically if MOQ is not met.</li>
            <li>Once an order enters production or shipment, payments are generally non-refundable except as described in the Refund Policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Shipping & Delivery</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Delivery timelines are estimates and may be affected by customs or logistics issues.</li>
            <li>Split shipments may occur at no additional charge to ensure timely delivery.</li>
          </ul>
          <p className="mt-2 text-sm">See our <Link className="underline" href="/shipping">Shipping Policy</Link> for details on tracking, insurance, and customs.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Refunds & Disputes</h2>
          <p className="mt-2">Refunds are governed by our <Link className="underline" href="/refund-policy">Refund Policy</Link>. In summary, refunds may apply if the MOQ is not reached, if an item is lost or damaged in transit, or if an order is canceled before supplier confirmation. Additional terms may apply; please review the Refund Policy.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">User Responsibilities</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>No fraudulent activity or abuse of the Service.</li>
            <li>Do not operate multiple accounts to manipulate group orders.</li>
            <li>Ensure your delivery address is accurate and up to date.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Platform Rights</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>We may modify listings, pricing, or supplier terms at any time.</li>
            <li>We may suspend or terminate accounts for misuse, fraud, or violations of these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Limitation of Liability</h2>
          <p className="mt-2">To the maximum extent permitted by law, PoolBuy is not liable for indirect, incidental, or consequential damages, including delays, customs charges, or lost profits. Our total liability is limited to the amount you paid for the applicable order.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Intellectual Property</h2>
          <p className="mt-2">All platform content, trademarks, and logos are the property of their respective owners. Users retain ownership of content they upload (e.g., reviews), and grant us a limited license to display such content on the Service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Governing Law & Dispute Resolution</h2>
          <p className="mt-2">These Terms are governed by the laws of Singapore. Any disputes will be subject to the exclusive jurisdiction of the courts of Singapore.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">Questions about these Terms can be sent to <a className="underline" href={`mailto:${email}`}>{email}</a>, or visit <Link className="underline" href="/support">Support</Link>.</p>
        </section>
      </div>
    </section>
  );
}
