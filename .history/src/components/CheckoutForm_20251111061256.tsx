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
  
  // Calculate max based on MOQ or use a reasonable default
  const maxQuantity = actualMoq ? Math.max(actualMoq * 2, 100) : 100;

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
    <div className="relative">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-yellow-200/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 animate-fade-in-up">
        <div className="md:col-span-2 overflow-hidden rounded-2xl border-2 border-orange-300/50 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-500 backdrop-blur-sm">
        <div className="flex items-start gap-6">
          <div className="size-32 shrink-0 overflow-hidden rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md">
            {img ? <img src={img} alt={actualTitle} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-lg text-neutral-900">{actualTitle}</div>
            <div className="mt-2 text-sm text-neutral-700"><span className="font-medium">Supplier:</span> {actualSupplier || '—'}</div>
            <div className="mt-1 text-sm text-neutral-700"><span className="font-medium">MOQ:</span> {actualMoq ? `≥${actualMoq}` : 'Varies'}</div>
            <div className="mt-1 text-base font-semibold text-orange-600">
              {formatCurrency(actualPrice)} <span className="text-sm text-neutral-500 font-normal">/ unit</span>
            </div>

            {sourceUrl ? (
              <div className="mt-3 text-xs">
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-orange-600 underline hover:text-orange-700 font-medium">View original listing →</a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-3">
              Quantity: <span className="text-orange-600">{quantity}</span> {quantity === 1 ? 'unit' : 'units'}
            </label>
            <div className="flex items-center gap-3">
              <input 
                type="range"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                aria-label="Select quantity"
                className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${((quantity - 1) / (maxQuantity - 1)) * 100}%, #e5e5e5 ${((quantity - 1) / (maxQuantity - 1)) * 100}%, #e5e5e5 100%)`
                }}
              />
              <input 
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                aria-label="Quantity input"
                className="w-20 rounded-lg border-2 border-orange-200 bg-white px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {actualMoq && quantity < actualMoq && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-200">
                <strong>Note:</strong> MOQ is {actualMoq} units. You can order less, but the pool must reach {actualMoq} total to proceed.
              </div>
            )}
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-neutral-800 mb-2">Notes (optional)</label>
            <input 
              id="notes"
              className="mt-1 w-full rounded-lg border-2 border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="Color, size, etc." 
            />
          </div>
        </div>

        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #171717;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #171717;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .slider::-webkit-slider-thumb:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transform: scale(1.1);
          }
          .slider::-moz-range-thumb:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transform: scale(1.1);
          }
        `}</style>

        <div className="mt-4 hidden text-sm text-neutral-500">Shipping and taxes are calculated at a later step.</div>
      </div>

      <div className="md:col-span-1 space-y-3">
        <OrderSummary 
          unitPrice={actualPrice} 
          quantity={quantity}
          currency={currency}
          productTitle={actualTitle}
          productImage={img || ''}
          paymentEnabled={true} 
        />
      </div>
    </div>
  );
}
