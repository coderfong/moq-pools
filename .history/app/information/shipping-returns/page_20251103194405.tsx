import React from "react";

export const metadata = {
  title: "Shipping & Returns Policy | MOQ Pools",
  description:
    "Our shipping, delivery estimates, lost/damaged shipments process, returns & refunds eligibility, and customs/tax guidance.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-12">
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-6">{title}</h2>
      <div className="text-base leading-7 text-gray-700">{children}</div>
    </section>
  );
}

export default function ShippingReturnsPage() {
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
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 text-2xl">📦</span>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">Shipping & Returns Policy</h1>
              </div>
              <p className="mt-4 max-w-3xl text-lg text-gray-700 leading-relaxed">
                How shipping works for group buys, when you can expect delivery, what to do if something goes wrong, and how
                returns and refunds are handled.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-2 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">Orders ship once groups reach MOQ and suppliers dispatch</span>
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

      <Section id="split-shipping" title="Split Shipping Policy">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some items may ship separately to ensure faster delivery.</li>
          <li>Each shipment will include its own tracking number and status updates.</li>
          <li>You won’t pay additional shipping — we cover split costs internally.</li>
        </ul>
        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
          <div className="font-medium text-neutral-900">Transparency tip</div>
          <div className="mt-1 text-neutral-700">In your Order Tracking page, we show progress like “2 of 3 shipments delivered.”</div>
        </div>
      </Section>

      <Section id="international" title="International Shipping & Surcharges">
        <div className="space-y-3">
          <p>We ship globally through our 3PL partners and regional carriers (YunExpress, SF Express, Aramex).</p>
          <p>
            International orders may incur customs duties, VAT, or import fees depending on your country’s regulations. Unless
            specified at checkout, these costs are the responsibility of the recipient.
          </p>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Destination</th>
                  <th className="px-3 py-2 text-left font-medium">Shipping Method</th>
                  <th className="px-3 py-2 text-left font-medium">Estimated Surcharge</th>
                  <th className="px-3 py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                <tr>
                  <td className="px-3 py-2">Southeast Asia</td>
                  <td className="px-3 py-2">Standard Air</td>
                  <td className="px-3 py-2">+US$0–2</td>
                  <td className="px-3 py-2 text-neutral-700">Usually included</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">USA / EU</td>
                  <td className="px-3 py-2">Economy Air</td>
                  <td className="px-3 py-2">+US$3–5</td>
                  <td className="px-3 py-2 text-neutral-700">Excludes VAT</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Remote regions</td>
                  <td className="px-3 py-2">EMS / DHL</td>
                  <td className="px-3 py-2">+US$10+</td>
                  <td className="px-3 py-2 text-neutral-700">Calculated at checkout</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-neutral-800">
            <span className="font-medium">Pro tip (business):</span> If you use 3PL like YunExpress or 4PX, negotiate Delivered Duty Paid (DDP) lanes
            for main markets so customers don’t face surprise fees.
          </div>
        </div>
      </Section>

      <Section id="lost-damaged" title="Lost or Damaged Items Procedure">
        <div className="space-y-2">
          <p>Every parcel is insured until it’s marked “Delivered.” If your item is lost or damaged in transit:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Contact us within 7 days of the estimated delivery date.</li>
            <li>Provide photos (if damaged) and your Order ID.</li>
            <li>We’ll investigate with the courier and supplier.</li>
            <li>Once confirmed, we’ll offer a replacement or credit refund depending on availability.</li>
          </ul>
          <p className="text-xs text-neutral-500">
            Refunds are processed to your original payment method. Investigation may take 5–10 business days depending on courier
            response.
          </p>
        </div>
      </Section>

      <Section id="returns" title="Return & Refund Eligibility">
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
            <div className="font-medium text-neutral-900">Group‑buy model: no retail change‑of‑mind returns</div>
            <p className="mt-1 text-neutral-700">
              Because orders are pooled to reach supplier MOQs, we do not support retail‑style refunds or returns for change of
              mind. This keeps pricing fair for the group and suppliers.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">Exceptions we cover</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>Damaged in transit (photos and packaging retained)</li>
                <li>Wrong item received</li>
                <li>Materially not as described</li>
              </ul>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="font-medium text-neutral-900">Not covered</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                <li>Change‑of‑mind or buyer’s remorse</li>
                <li>Used items or missing key packaging/accessories</li>
                <li>Damage from improper use or installation</li>
              </ul>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-neutral-800">
            <span className="font-medium">No MOQ = No charge.</span> If a group doesn’t reach its MOQ by the deadline, you’re not charged (or any
            pre‑authorization is voided). This is our core buyer protection.
          </div>
          <p className="text-xs text-neutral-500">
            For approved cases, refunds are issued to the original payment method after inspection/confirmation per our Lost or
            Damaged procedure.
          </p>
        </div>
      </Section>

      <Section id="customs" title="Customs, Duties & Taxes">
        <div className="space-y-2">
          <p>International buyers are responsible for any import taxes, customs duties, or local postal surcharges unless otherwise stated.</p>
          <p>Our system automatically identifies DDP (Delivered Duty Paid) routes where possible.</p>
          <p>For DDU (Delivered Duty Unpaid) shipments, your local customs may contact you for payment before delivery.</p>
        </div>
      </Section>

      <Section id="contact" title="Contact & Dispute Resolution">
        <div className="space-y-2">
          <p>Need help with a shipment or return? Choose any channel below and include your Order ID.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/account/messages" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">Contact support</a>
            <a href="mailto:support@moqpools.com" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Email support@moqpools.com</a>
            <a href="/faq" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Read FAQ</a>
          </div>
          <div className="text-sm text-neutral-700">Operating hours: Mon–Fri, 9:00–18:00 (UTC+8)</div>
          <div className="text-sm text-neutral-700">Escalation path: use “Report an Issue” from your Order Tracking page for shipping claims.</div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700">
            Payments made via Stripe or PayPal remain eligible for their Buyer Protection policies in case of unresolved disputes.
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            This page summarizes our policy and does not override our Terms of Service or applicable consumer laws.
          </p>
        </div>
      </Section>

      <Section id="integration" title="Backend & Legal Integration">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Policy Type</th>
                <th className="px-3 py-2 text-left font-medium">Stored In</th>
                <th className="px-3 py-2 text-left font-medium">Used By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              <tr>
                <td className="px-3 py-2">Estimated delivery windows</td>
                <td className="px-3 py-2">shipping_regions table</td>
                <td className="px-3 py-2 text-neutral-700">Order ETA calculations</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Return eligibility rules</td>
                <td className="px-3 py-2">return_policies table</td>
                <td className="px-3 py-2 text-neutral-700">Customer support logic</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Courier SLAs</td>
                <td className="px-3 py-2">courier_service_levels table</td>
                <td className="px-3 py-2 text-neutral-700">Tracking updates</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Lost/damaged reporting window</td>
                <td className="px-3 py-2">config (7 days default)</td>
                <td className="px-3 py-2 text-neutral-700">Automated support form validation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="ux" title="UX Enhancements">
        <ul className="list-disc space-y-2 pl-5">
          <li>Add trust badges: "Insured Shipping", "No MOQ, No Charge", "Verified Fulfillment Partners".</li>
          <li>Embed a "Read Shipping Policy" link in the Order Tracking page footer.</li>
          <li>Show dynamic delivery estimates at checkout based on buyer region.</li>
        </ul>
        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
          <div className="font-medium text-neutral-900">Message template (after shipping)</div>
          <p className="mt-1 text-neutral-700">
            Your package is on the way! Estimated delivery: Oct 29–Nov 2. Read shipping terms{' '}
            <a className="underline" href="/information/shipping-returns">here</a>.
          </p>
        </div>
      </Section>
    </div>
  );
}
