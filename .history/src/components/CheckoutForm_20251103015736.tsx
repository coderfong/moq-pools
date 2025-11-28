"use client";
import React from "react";
import OrderSummary from "./OrderSummary";

interface CheckoutFormProps {
  img: string | null;
  actualTitle: string;
  actualSupplier?: string;
  actualMoq: number | null;
  actualPrice: number | null;
  currency: string;
  sourceUrl: string | null;
}

export default function CheckoutForm({
  img,
  actualTitle,
  actualSupplier,
  actualMoq,
  actualPrice,
  currency,
  sourceUrl,
}: CheckoutFormProps) {
  const [quantity, setQuantity] = React.useState(1);

  const formatCurrency = (n: number | null) => {
    if (n === null) return 'Contact supplier';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="md:col-span-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-start gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            {img ? <img src={img} alt={actualTitle} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-neutral-900">{actualTitle}</div>
            <div className="mt-1 text-sm text-neutral-700">Supplier: {actualSupplier || '—'}</div>
            <div className="mt-1 text-sm text-neutral-700">MOQ: {actualMoq ? `≥${actualMoq}` : 'Varies'}</div>
            <div className="mt-1 text-sm text-neutral-700">
              Price: {formatCurrency(actualPrice)} <span className="text-neutral-500">/ unit</span>
            </div>

            {sourceUrl ? (
              <div className="mt-2 text-xs">
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline">View original listing</a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-neutral-700">Quantity</label>
            <input 
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900" 
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1} 
              type="number" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700">Notes (optional)</label>
            <input className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Color, size, etc." />
          </div>
        </div>

        <div className="mt-4 hidden text-sm text-neutral-500">Shipping and taxes are calculated at a later step.</div>
      </div>

      <div className="md:col-span-1 space-y-3">
        <OrderSummary 
          unitPrice={actualPrice} 
          quantity={quantity}
          currency={currency} 
          paymentEnabled={true} 
        />
      </div>
    </div>
  );
}
