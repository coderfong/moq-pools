import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MOQ Pools",
  description: "How we collect, use, and protect your information across our group-buy platform.",
};

export default function PrivacyPage() {
  const email = "support@moqmarket.com";
  const updated = "October 2025";
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 py-8 text-neutral-900">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-neutral-600">Last updated: {updated}</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-neutral-800">
        <section>
          <h2 className="text-lg font-semibold">Introduction</h2>
          <p className="mt-2">This Privacy Policy describes how MOQ Pools ("we", "us") collects, uses, and protects your information when you use our platform. We operate from Singapore and process data in alignment with applicable laws including PDPA (Singapore), GDPR (EU), and CCPA (US).</p>
          <p className="mt-2">For any privacy-related inquiries, contact us at <a className="underline" href={`mailto:${email}`}>{email}</a>.</p>
          <p className="mt-2 text-sm text-neutral-700">See also our <Link className="underline" href="/terms">Terms of Service</Link> for contractual terms and service use.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Account details: name, email, password (stored as a hash).</li>
            <li>Order and shipping details: addresses, phone (where provided).</li>
            <li>Payment information: processed by Stripe/PayPal. We do not store full card details on our servers.</li>
            <li>Usage data: cookies, page interactions, approximate location (from IP), device/browser info.</li>
            <li>Analytics: if enabled, we may use tools like Google Analytics or Meta Pixel to understand usage and improve service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How We Use Your Information</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>To process orders, payments, pooling progress, and shipping updates.</li>
            <li>To provide customer support and respond to inquiries.</li>
            <li>To prevent fraud and verify payments.</li>
            <li>To improve services (troubleshooting, analytics, feedback).</li>
            <li>Marketing (with consent): you can unsubscribe at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Cookies & Tracking</h2>
          <p className="mt-2">We use cookies to keep you signed in, remember preferences, and analyze usage. You can manage cookies in your browser settings. If we provide cookie controls, they will be accessible from your account or site footer.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Data Storage & Security</h2>
          <p className="mt-2">Data is stored in secure databases with industry-standard encryption in transit and at rest. Access is restricted to authorized personnel, and we apply best practices to protect against unauthorized access, alteration, or disclosure.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Third-Party Sharing</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Payments: Stripe and/or PayPal to authorize and capture payments.</li>
            <li>Fulfillment: Couriers and logistics partners to deliver goods; suppliers to fulfill orders.</li>
            <li>Analytics/Marketing: If used, tools such as Google Analytics or Meta platforms.</li>
            <li>Legal compliance: When required by law or to protect rights and safety.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your Rights</h2>
          <p className="mt-2">Subject to applicable laws, you may have the right to access, correct, export, or delete your personal data, as well as to object to or restrict certain processing. You can also unsubscribe from marketing communications at any time.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact for Data Requests</h2>
          <p className="mt-2">To exercise your rights or request information deletion, contact us at <a className="underline" href={`mailto:${email}`}>{email}</a>. We’ll respond within a reasonable timeframe and in accordance with applicable laws. You can also reach out via our <Link className="underline" href="/support">Support</Link> page.</p>
        </section>
      </div>
    </section>
  );
}
