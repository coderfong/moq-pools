import React from "react";

export const metadata = {
  title: "Shipping & Returns Policy | MOQ Pools",
  description:
    "How shipping works for group buys, when to expect delivery, and what to do if something goes wrong.",
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
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📋</span>
            <div className="text-gray-700">
              Group buys ship after the minimum order quantity (MOQ) is reached and the supplier confirms dispatch. Before that,
              your order remains in a pending/escrow state.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📦</span>
            <div className="text-gray-700">
              When a pool completes, we consolidate shipments where practical for efficiency. Some orders may ship in multiple
              parcels depending on item availability and supplier locations.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📍</span>
            <div className="text-gray-700">
              Tracking details are provided once the order is in transit. You can check updates under Account → Orders.
            </div>
          </div>
        </div>
      </Section>

      <Section id="delivery-times" title="Estimated delivery times">
        <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Stage</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Typical timeframe</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Pool completion (reach MOQ)</td>
                <td className="px-6 py-4 text-gray-700">Varies by demand</td>
                <td className="px-6 py-4 text-gray-600">We'll email when the pool completes.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Supplier prep & handoff</td>
                <td className="px-6 py-4 text-gray-700">3-10 business days</td>
                <td className="px-6 py-4 text-gray-600">Quality checks, packing, export clearance where applicable.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">International transit</td>
                <td className="px-6 py-4 text-gray-700">5-15 business days</td>
                <td className="px-6 py-4 text-gray-600">Timing varies by route, carrier, and customs processing.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Domestic last-mile</td>
                <td className="px-6 py-4 text-gray-700">2-7 business days</td>
                <td className="px-6 py-4 text-gray-600">Local carrier delivery times may vary during peak periods.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⏱️</span>
            <div className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Note:</span> Estimates are averages and not guarantees. Weather, customs, or carrier delays can extend delivery windows.
            </div>
          </div>
        </div>
      </Section>

      <Section id="split-shipping" title="Split Shipping Policy">
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📤</span>
            <div className="text-gray-700">
              Some items may ship separately to ensure faster delivery.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
            <span className="text-2xl">🔢</span>
            <div className="text-gray-700">
              Each shipment will include its own tracking number and status updates.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
            <span className="text-2xl">💰</span>
            <div className="text-gray-700">
              You won't pay additional shipping - we cover split costs internally.
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <div className="font-bold text-lg text-gray-900">Transparency tip</div>
          </div>
          <div className="text-gray-700">In your Order Tracking page, we show progress like "2 of 3 shipments delivered."</div>
        </div>
      </Section>

      <Section id="international" title="International Shipping & Surcharges">
        <div className="space-y-6">
          <p>We ship globally through our 3PL partners and regional carriers (YunExpress, SF Express, Aramex).</p>
          <p>
            International orders may incur customs duties, VAT, or import fees depending on your country's regulations. Unless
            specified at checkout, these costs are the responsibility of the recipient.
          </p>
          <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Destination</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Shipping Method</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Estimated Surcharge</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">Southeast Asia</td>
                  <td className="px-6 py-4 text-gray-700">Standard Air</td>
                  <td className="px-6 py-4 text-gray-700">+US$0-2</td>
                  <td className="px-6 py-4 text-gray-600">Usually included</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">USA / EU</td>
                  <td className="px-6 py-4 text-gray-700">Economy Air</td>
                  <td className="px-6 py-4 text-gray-700">+US$3-5</td>
                  <td className="px-6 py-4 text-gray-600">Excludes VAT</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">Remote regions</td>
                  <td className="px-6 py-4 text-gray-700">EMS / DHL</td>
                  <td className="px-6 py-4 text-gray-700">+US$10+</td>
                  <td className="px-6 py-4 text-gray-600">Calculated at checkout</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💼</span>
              <div>
                <span className="font-bold text-gray-900">Pro tip (business):</span>
                <span className="text-gray-700"> If you use 3PL like YunExpress or 4PX, negotiate Delivered Duty Paid (DDP) lanes for main markets so customers don't face surprise fees.</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="lost-damaged" title="Lost or Damaged Items Procedure">
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-900">Every parcel is insured until it's marked "Delivered." If your item is lost or damaged in transit:</p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">1</span>
              <div className="text-gray-700">
                Contact us within 7 days of the estimated delivery date.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">2</span>
              <div className="text-gray-700">
                Provide photos (if damaged) and your Order ID.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">3</span>
              <div className="text-gray-700">
                We'll investigate with the courier and supplier.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-md">4</span>
              <div className="text-gray-700">
                Once confirmed, we'll offer a replacement or credit refund depending on availability.
              </div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">📝</span>
              <div className="text-sm text-gray-700">
                Refunds are processed to your original payment method. Investigation may take 5-10 business days depending on courier response.
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="returns" title="Return & Refund Eligibility">
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🛒</span>
              <div className="font-bold text-lg text-gray-900">Group-buy model: no retail change-of-mind returns</div>
            </div>
            <p className="text-gray-700">
              Because orders are pooled to reach supplier MOQs, we do not support retail-style refunds or returns for change of
              mind. This keeps pricing fair for the group and suppliers.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <div className="font-bold text-lg text-gray-900">Exceptions we cover</div>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Damaged in transit (photos and packaging retained)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Wrong item received</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Materially not as described</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">❌</span>
                <div className="font-bold text-lg text-gray-900">Not covered</div>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Change-of-mind or buyer's remorse</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Used items or missing key packaging/accessories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Damage from improper use or installation</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <span className="font-bold text-gray-900">No MOQ = No charge.</span>
                <span className="text-gray-700"> If a group doesn't reach its MOQ by the deadline, you're not charged (or any pre-authorization is voided). This is our core buyer protection.</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">💳</span>
              <div className="text-sm text-gray-700">
                For approved cases, refunds are issued to the original payment method after inspection/confirmation per our Lost or Damaged procedure.
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="customs" title="Customs, Duties & Taxes">
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
            <span className="text-2xl">🌍</span>
            <div className="text-gray-700">
              International buyers are responsible for any import taxes, customs duties, or local postal surcharges unless otherwise stated.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📋</span>
            <div className="text-gray-700">
              Our system automatically identifies DDP (Delivered Duty Paid) routes where possible.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📬</span>
            <div className="text-gray-700">
              For DDU (Delivered Duty Unpaid) shipments, your local customs may contact you for payment before delivery.
            </div>
          </div>
        </div>
      </Section>

      <Section id="contact" title="Contact & Dispute Resolution">
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-900">Need help with a shipment or return? Choose any channel below and include your Order ID.</p>
          <div className="flex flex-wrap gap-3">
            <a href="/account/messages" className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-base font-medium text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">Contact support</a>
            <a href="mailto:support@moqpools.com" className="rounded-xl border-2 border-orange-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all">Email support@moqpools.com</a>
            <a href="/faq" className="rounded-xl border-2 border-blue-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-all">Read FAQ</a>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <span className="text-xl">⏰</span>
              <div className="text-sm text-gray-700">Operating hours: Mon-Fri, 9:00-18:00 (UTC+8)</div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
              <span className="text-xl">📊</span>
              <div className="text-sm text-gray-700">Escalation path: use "Report an Issue" from your Order Tracking page for shipping claims.</div>
            </div>
            <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div className="text-sm text-gray-700">
                  Payments made via <span className="font-semibold text-gray-900">Stripe</span> remain eligible for their Buyer Protection policies in case of unresolved disputes.
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 shadow-sm">
            <p className="text-xs text-gray-600">
              This page summarizes our policy and does not override our Terms of Service or applicable consumer laws.
            </p>
          </div>
        </div>
      </Section>

      <Section id="integration" title="Backend & Legal Integration">
        <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Policy Type</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Stored In</th>
                <th className="px-6 py-4 text-left font-bold text-gray-900">Used By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Estimated delivery windows</td>
                <td className="px-6 py-4 text-gray-700">shipping_regions table</td>
                <td className="px-6 py-4 text-gray-600">Order ETA calculations</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Return eligibility rules</td>
                <td className="px-6 py-4 text-gray-700">return_policies table</td>
                <td className="px-6 py-4 text-gray-600">Customer support logic</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Courier SLAs</td>
                <td className="px-6 py-4 text-gray-700">courier_service_levels table</td>
                <td className="px-6 py-4 text-gray-600">Tracking updates</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Lost/damaged reporting window</td>
                <td className="px-6 py-4 text-gray-700">config (7 days default)</td>
                <td className="px-6 py-4 text-gray-600">Automated support form validation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="ux" title="UX Enhancements">
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
            <span className="text-2xl">🏆</span>
            <div className="text-gray-700">
              Add trust badges: "Insured Shipping", "No MOQ, No Charge", "Verified Fulfillment Partners".
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
            <span className="text-2xl">🔗</span>
            <div className="text-gray-700">
              Embed a "Read Shipping Policy" link in the Order Tracking page footer.
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
            <span className="text-2xl">📍</span>
            <div className="text-gray-700">
              Show dynamic delivery estimates at checkout based on buyer region.
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💬</span>
            <div className="font-bold text-lg text-gray-900">Message template (after shipping)</div>
          </div>
          <p className="text-gray-700">
            Your package is on the way! Estimated delivery: Oct 29-Nov 2. Read shipping terms{' '}
            <a className="underline text-orange-600 hover:text-orange-700 font-medium" href="/information/shipping-returns">here</a>.
          </p>
        </div>
      </Section>
      </div>
    </div>
  );
}
