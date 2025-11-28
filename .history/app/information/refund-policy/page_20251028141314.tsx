import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Refund Policy | MOQ Pools",
  description:
    "Crystal‑clear refunds aligned with our escrow model: No MOQ, No Charge. Learn when you’re charged and how refunds work.",
};

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4 open:shadow-sm" {...(defaultOpen ? { open: true } : {})}>
      <summary className="cursor-pointer select-none list-none text-base font-medium text-neutral-900">
        <span className="mr-2 inline-block align-middle">▸</span>
        <span className="align-middle">{title}</span>
      </summary>
      <div className="mt-3 text-sm leading-6 text-neutral-800">{children}</div>
    </details>
  );
}

export default function RefundPolicyPage() {
  const contactEmail = "support@moqmarket.com";
  const updated = "October 2025";
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Refund Policy</h1>
      <p className="mt-1 text-sm text-neutral-600">Last updated: {updated}</p>

      <div className="mt-6 space-y-4">
        <Accordion title="When you’re charged" defaultOpen>
          <ul className="list-disc space-y-1 pl-5">
            <li>Payments are only captured once the group reaches its MOQ.</li>
            <li>Before that, your payment stays in pending authorization (held, not charged).</li>
          </ul>
        </Accordion>

        <Accordion title="If MOQ isn’t met">
          <ul className="list-disc space-y-1 pl-5">
            <li>Authorization is automatically voided — no money leaves your account.</li>
            <li>The hold typically disappears in 1–3 business days depending on your bank.</li>
          </ul>
        </Accordion>

        <Accordion title="Refund eligibility (after MOQ reached)">
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                <tr>
                  <td className="px-3 py-2">Item damaged or defective</td>
                  <td className="px-3 py-2">Replacement or refund</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Wrong item received</td>
                  <td className="px-3 py-2">Replacement or refund</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Order never shipped</td>
                  <td className="px-3 py-2">Refund</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Order lost in transit</td>
                  <td className="px-3 py-2">Refund after courier investigation</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Buyer changes mind</td>
                  <td className="px-3 py-2">Not eligible after MOQ reached</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Refund process">
          <ul className="list-disc space-y-1 pl-5">
            <li>Refunds are returned to the original payment method.</li>
            <li>Processing time: typically 5–10 business days depending on provider/bank.</li>
            <li>We’ll notify you via email and your Messages page when processed.</li>
          </ul>
        </Accordion>

        <Accordion title="Partial refunds (split orders)">
          <p>If part of a multi‑shipment order is lost or undelivered, refunds apply only to that affected portion.</p>
        </Accordion>

        <Accordion title="Chargebacks">
          <ul className="list-disc space-y-1 pl-5">
            <li>Please contact support before filing a chargeback so we can resolve quickly.</li>
            <li>Stripe/PayPal disputes are honored if we fail to respond according to their rules.</li>
          </ul>
        </Accordion>

        <Accordion title="Non‑refundable cases">
          <ul className="list-disc space-y-1 pl-5">
            <li>MOQ met and item shipped successfully</li>
            <li>Delays within the estimated delivery window</li>
            <li>Customs, duties, or tax fees charged by local authorities</li>
          </ul>
        </Accordion>

        <Accordion title="Contact">
          <p>
            For refunds or issues, email <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>. Include your Order ID, photos, and details.
          </p>
          <p className="mt-2 text-sm text-neutral-700">
            Helpful links: <Link className="underline" href="/terms">Terms of Service</Link> · <Link className="underline" href="/privacy">Privacy Policy</Link> · <Link className="underline" href="/support">Contact</Link>
          </p>
        </Accordion>
      </div>
    </section>
  );
}
