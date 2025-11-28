import React from "react";

export const metadata = {
  title: "Shipping & Returns Policy | MOQ Pools",
  description:
    "Our shipping, delivery estimates, lost/damaged shipments process, returns & refunds eligibility, and customs/tax guidance.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-8">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  );
}

export default function ShippingReturnsPage() {
  return (
    <div className="pb-12">
      {/* Hero / Intro */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:py-12">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-neutral-900">
                <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white">📦</span>
                <h1 className="text-2xl font-bold tracking-tight">Shipping & Returns Policy</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-neutral-700">
                How shipping works for group buys, when you can expect delivery, what to do if something goes wrong, and how
                returns and refunds are handled.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Orders ship once groups reach MOQ and suppliers dispatch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section id="overview" title="Shipping overview">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Group buys ship after the minimum order quantity (MOQ) is reached and the supplier confirms dispatch. Before that,
            your order remains in a pending/escrow state.
          </li>
          <li>
            When a pool completes, we consolidate shipments where practical for efficiency. Some orders may ship in multiple
            parcels depending on item availability and supplier locations.
          </li>
          <li>Tracking details are provided once the order is in transit. You can check updates under Account → Orders.</li>
        </ul>
      </Section>

      <Section id="delivery-times" title="Estimated delivery times">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Stage</th>
                <th className="px-3 py-2 text-left font-medium">Typical timeframe</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              <tr>
                <td className="px-3 py-2">Pool completion (reach MOQ)</td>
                <td className="px-3 py-2">Varies by demand</td>
                <td className="px-3 py-2 text-neutral-700">We’ll email when the pool completes.</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Supplier prep & handoff</td>
                <td className="px-3 py-2">3–10 business days</td>
                <td className="px-3 py-2 text-neutral-700">Quality checks, packing, export clearance where applicable.</td>
              </tr>
              <tr>
                <td className="px-3 py-2">International transit</td>
                <td className="px-3 py-2">5–15 business days</td>
                <td className="px-3 py-2 text-neutral-700">Timing varies by route, carrier, and customs processing.</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Domestic last‑mile</td>
                <td className="px-3 py-2">2–7 business days</td>
                <td className="px-3 py-2 text-neutral-700">Local carrier delivery times may vary during peak periods.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          Estimates are averages and not guarantees. Weather, customs, or carrier delays can extend delivery windows.
        </div>
      </Section>

      <Section id="split-shipping" title="Split shipping (partial shipments)">
        <p>
          To speed up delivery, some orders ship in multiple parcels as items become available. If your order is split, you’ll
          receive separate tracking numbers and deliveries may arrive on different days.
        </p>
      </Section>

      <Section id="international" title="International shipping, duties & restrictions">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Cross‑border orders may be subject to customs inspections, import duties, or taxes. These are the responsibility of
            the recipient unless otherwise stated at checkout.
          </li>
          <li>
            Certain items may be restricted or require additional documentation depending on destination regulations. We’ll
            contact you if any extra information is needed.
          </li>
        </ul>
      </Section>

      <Section id="lost-damaged" title="Lost, late, or damaged shipments">
        <div className="space-y-2">
          <p>If something goes wrong with delivery, we’ll sort it out with the carrier and supplier.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Marked delivered but not received: check with household members and neighbors, then contact support within 3
              business days.
            </li>
            <li>In‑transit issues: if a package is stalled, we’ll work with the carrier to investigate and resolve.</li>
            <li>
              Damaged items: keep all packaging and take clear photos of the item and box. Report within 7 days of delivery so
              we can file a claim.
            </li>
          </ul>
          <p className="text-xs text-neutral-500">Tip: Upload photos from Account → Orders to speed up resolution.</p>
        </div>
      </Section>

      <Section id="returns" title="Returns & refunds">
        <div className="space-y-2">
          <p className="text-neutral-700">
            Our goal is to make group buying fair and simple. Eligibility depends on product type and condition on return.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">Eligible for return</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>New, unused items in original packaging (within 14 days of delivery)</li>
                <li>Wrong item received</li>
                <li>Materially not as described</li>
                <li>Damaged in transit (with photos and packaging retained)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">Not eligible</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>Used items or missing key packaging/accessories</li>
                <li>Final‑sale, perishable, or personalized items</li>
                <li>Damage from improper use or installation</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            For approved returns, refunds are issued to the original payment method once the returned item is received and
            inspected. Original shipping fees are non‑refundable unless the return is due to our error.
          </p>
        </div>
      </Section>

      <Section id="customs" title="Customs, duties & taxes">
        <p>
          Import duties and taxes vary by destination and product. If duties/taxes are not collected at checkout, any amounts
          assessed at import are the responsibility of the recipient. We can provide commercial invoices upon request.
        </p>
      </Section>

      <Section id="contact" title="Contact & dispute resolution">
        <p>
          Need help with a shipment or return? Open a support request from your account and include your order number. We’ll
          respond by email and guide you through next steps.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/account/messages" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">Contact support</a>
          <a href="/faq" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Read FAQ</a>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          This page summarizes our policy and does not override our Terms of Service or applicable consumer laws.
        </p>
      </Section>
    </div>
  );
}
