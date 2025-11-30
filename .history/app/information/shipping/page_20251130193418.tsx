import React from "react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Shipping Policy | MOQ Pools",
  description: "Shipping timelines, tracking, insurance, and customs for group orders.",
};

export default function ShippingPolicyPage() {
  const updated = "October 2025";
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 py-8 text-neutral-900">
      <h1 className="text-3xl font-bold tracking-tight">Shipping Policy</h1>
      <p className="mt-1 text-sm text-neutral-600">Last updated: {updated}</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-neutral-800">
        <section>
          <h2 className="text-lg font-semibold">Timelines</h2>
          <p className="mt-2">Shipping windows vary by supplier and lane. Estimated dispatch time is provided once MOQ is met and the supplier confirms the order.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Tracking</h2>
          <p className="mt-2">We provide tracking once the order ships. For consolidated shipments, tracking may update in stages as items clear the hub.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Insurance & Loss</h2>
          <p className="mt-2">Orders are covered by carrier or third‑party insurance where applicable. If a shipment is lost, we’ll file a claim and refund according to our <Link href="/refund-policy" className="underline">Refund Policy</Link>.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Customs & Duties</h2>
          <p className="mt-2">Buyers are responsible for customs, duties, and local taxes unless otherwise stated. These fees are not refundable by us.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">Questions about shipping? Visit <Link href="/support" className="underline">Support</Link>.</p>
        </section>
      </div>
    </section>
  );
}
