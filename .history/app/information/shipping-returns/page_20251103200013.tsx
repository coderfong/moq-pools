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
                How shipping works for group buys, when to expect delivery, and what to do if something goes wrong.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-2 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">You're only charged once MOQ is confirmed</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section id="overview" title="How Shipping Works">
        <div className="space-y-6">
          <p className="text-lg text-gray-900">
            All group-buy orders ship once the product's Minimum Order Quantity (MOQ) is reached and the supplier confirms dispatch.
          </p>
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">�</span>
              <div className="font-bold text-lg text-gray-900">Payment Protection</div>
            </div>
            <p className="text-gray-700">
              Until then, your payment remains on hold in escrow (you're only charged once the group is confirmed).
            </p>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
            <div className="font-bold text-lg text-gray-900 mb-4">Once MOQ is hit:</div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <div className="text-gray-700">We consolidate shipments wherever possible to keep costs low.</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <div className="text-gray-700">Some items may ship separately depending on supplier location or stock availability.</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <div className="text-gray-700">Tracking details are shared automatically via your Account → Orders page and the Messages tab.</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="delivery-times" title="Estimated Delivery Timeline">
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
                <td className="px-6 py-4 font-medium text-gray-900">Pool completion (MOQ reached)</td>
                <td className="px-6 py-4 text-gray-700">Varies by product demand</td>
                <td className="px-6 py-4 text-gray-600">We'll notify you when your pool completes.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Supplier prep & handoff</td>
                <td className="px-6 py-4 text-gray-700">3-10 business days</td>
                <td className="px-6 py-4 text-gray-600">Includes packing, quality check, and export clearance.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">International transit</td>
                <td className="px-6 py-4 text-gray-700">5-15 business days</td>
                <td className="px-6 py-4 text-gray-600">Dependent on route, carrier, and customs.</td>
              </tr>
              <tr className="hover:bg-orange-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Domestic last-mile</td>
                <td className="px-6 py-4 text-gray-700">2-7 business days</td>
                <td className="px-6 py-4 text-gray-600">Local courier delivery; varies by country.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⏱️</span>
            <div className="text-sm text-gray-700">
              All timeframes are estimates and not guarantees. Weather, customs, or courier delays may extend delivery windows.
            </div>
          </div>
        </div>
      </Section>

      <Section id="split-shipping" title="Split Shipping Policy">
        <div className="space-y-6">
          <p className="text-lg text-gray-900">To get your products faster:</p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
              <span className="text-2xl">📤</span>
              <div className="text-gray-700">
                Some items may ship separately (e.g., if sourced from different factories).
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <span className="text-2xl">🔢</span>
              <div className="text-gray-700">
                Each parcel includes its own tracking number and delivery status.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="text-2xl">💰</span>
              <div className="text-gray-700">
                You'll never be double-charged - any extra shipping is absorbed by us.
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💡</span>
              <div className="font-bold text-lg text-gray-900">Real-time tracking</div>
            </div>
            <div className="text-gray-700">In your Order Tracking page, we show real-time progress like: "2 of 3 shipments delivered."</div>
          </div>
        </div>
      </Section>

      <Section id="international" title="International Shipping & Surcharges">
        <div className="space-y-6">
          <p>We ship to most countries worldwide via verified logistics partners (YunExpress, 4PX, SF Express, Aramex, etc.).</p>
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
                  <td className="px-6 py-4 font-medium text-gray-900">Remote Regions</td>
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
                <span className="font-bold text-gray-900">Pro Tip (Business Users):</span>
                <span className="text-gray-700"> If you're running bulk imports or resale, we support Delivered Duty Paid (DDP) lanes for select markets so your customers don't face customs on delivery.</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="dynamic-costs" title="Dynamic Shipping Costs">
        <div className="space-y-6">
          <p className="text-lg text-gray-900">
            Shipping costs automatically decrease as group size increases.
          </p>
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
            <div className="font-bold text-lg text-gray-900 mb-4">Each product has its own shipping curve based on:</div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">📏</span>
                <div className="text-gray-700">Product weight or size</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🌍</span>
                <div className="text-gray-700">Destination region</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">👥</span>
                <div className="text-gray-700">Total confirmed buyers in the group</div>
              </div>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50 px-6 py-4">
              <div className="font-bold text-lg text-gray-900">Example Shipping Tiers:</div>
            </div>
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200/50">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Group Size</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Small Items</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Medium Items</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">Large Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">1-9 pcs</td>
                  <td className="px-6 py-4 text-gray-700">$5.00</td>
                  <td className="px-6 py-4 text-gray-700">$8.00</td>
                  <td className="px-6 py-4 text-gray-700">$15.00</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">10-24 pcs</td>
                  <td className="px-6 py-4 text-gray-700">$3.50</td>
                  <td className="px-6 py-4 text-gray-700">$6.00</td>
                  <td className="px-6 py-4 text-gray-700">$12.00</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">25-49 pcs</td>
                  <td className="px-6 py-4 text-gray-700">$2.50</td>
                  <td className="px-6 py-4 text-gray-700">$4.50</td>
                  <td className="px-6 py-4 text-gray-700">$10.00</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">50-99 pcs</td>
                  <td className="px-6 py-4 text-gray-700">$1.80</td>
                  <td className="px-6 py-4 text-gray-700">$3.50</td>
                  <td className="px-6 py-4 text-gray-700">$8.50</td>
                </tr>
                <tr className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">100+ pcs</td>
                  <td className="px-6 py-4 text-emerald-700 font-semibold">$1.20</td>
                  <td className="px-6 py-4 text-emerald-700 font-semibold">$2.90</td>
                  <td className="px-6 py-4 text-emerald-700 font-semibold">$7.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <span className="text-2xl">🔓</span>
              <div className="text-gray-700">
                <span className="font-semibold text-gray-900">Cheaper shipping tiers unlock automatically</span> when your group grows.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
              <span className="text-2xl">💳</span>
              <div className="text-gray-700">
                You'll only be charged the final confirmed rate when MOQ is hit.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="text-2xl">💰</span>
              <div className="text-gray-700">
                If actual shipping ends up cheaper than the estimate, we'll automatically refund or credit the difference.
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="lost-damaged" title="Lost or Damaged Items Procedure">
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-900">Every parcel is insured until it's marked "Delivered."</p>
          <p className="text-gray-700">If your item is lost or damaged:</p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">1</span>
              <div className="text-gray-700">
                Contact support within 7 days of estimated delivery.
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">2</span>
              <div className="text-gray-700">
                Include your Order ID and photos (for damage).
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md">3</span>
              <div className="text-gray-700">
                We'll verify with the courier and supplier.
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
                Investigation may take 5-10 business days depending on courier response. Refunds are always issued to your original payment method.
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="returns" title="Return & Refund Eligibility">
        <div className="space-y-6">
          <p className="text-lg text-gray-900">
            Because of the group-buy model, we don't support change-of-mind returns - it keeps pricing fair for all members.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <div className="font-bold text-lg text-gray-900">Covered Scenarios</div>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Damaged during transit (with proof)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Wrong item received</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Product materially not as described</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🚫</span>
                <div className="font-bold text-lg text-gray-900">Not Covered</div>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Change of mind or buyer's remorse</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Used or altered items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Missing accessories or packaging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Damage caused by misuse or installation error</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">�</span>
              <div>
                <span className="font-bold text-gray-900">MOQ Protection:</span>
                <span className="text-gray-700"> If a group doesn't reach its MOQ by the deadline: You're not charged at all. Any pre-authorization or hold is automatically voided.</span>
              </div>
            </div>
          </div>
        </div>
      </Section>
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
