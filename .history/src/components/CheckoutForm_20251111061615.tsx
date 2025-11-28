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
    <div className="relative min-h-screen">
      {/* Enhanced Animated Background with Gradient Mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-300/40 to-amber-300/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-br from-amber-300/40 to-yellow-300/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-br from-yellow-300/30 to-orange-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-rose-300/20 to-pink-300/20 rounded-full blur-3xl animate-blob animation-delay-700" />
        
        {/* Sparkle effects */}
        <div className="absolute top-20 right-20 w-2 h-2 bg-orange-400 rounded-full animate-sparkle" />
        <div className="absolute top-40 left-40 w-1.5 h-1.5 bg-amber-400 rounded-full animate-sparkle animation-delay-300" />
        <div className="absolute bottom-32 right-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle animation-delay-500" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 animate-fade-in-up">
        <div className="md:col-span-2 group overflow-hidden rounded-2xl border-2 border-orange-300/50 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-8 shadow-xl hover:shadow-2xl hover:border-orange-400/60 transition-all duration-500 backdrop-blur-sm relative">
          {/* Card glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 via-amber-400/0 to-yellow-400/0 group-hover:from-orange-400/5 group-hover:via-amber-400/5 group-hover:to-yellow-400/5 transition-all duration-500 rounded-2xl" />
          
          <div className="relative flex items-start gap-6">
            <div className="size-32 shrink-0 overflow-hidden rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100 shadow-lg hover:scale-105 transition-transform duration-300">
              {img ? <img src={img} alt={actualTitle} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-bold text-xl bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">{actualTitle}</h2>
              <div className="mt-3 space-y-1.5">
                <div className="text-sm text-neutral-700">
                  <span className="font-semibold text-neutral-800">Supplier:</span> {actualSupplier || '—'}
                </div>
                <div className="text-sm text-neutral-700">
                  <span className="font-semibold text-neutral-800">MOQ:</span> {actualMoq ? `≥${actualMoq}` : 'Varies'}
                </div>
                <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {formatCurrency(actualPrice)} <span className="text-sm text-neutral-500 font-normal">/ unit</span>
                </div>
              </div>

              {sourceUrl ? (
                <div className="mt-4">
                  <a 
                    href={sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-semibold underline decoration-2 underline-offset-2 transition-colors duration-200"
                  >
                    View original listing
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="animate-fade-in-up animation-delay-100">
              <label className="block text-sm font-bold text-neutral-900 mb-4">
                Quantity: <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{quantity}</span> {quantity === 1 ? 'unit' : 'units'}
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  aria-label="Select quantity"
                  className="flex-1 h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer slider"
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
                  className="w-20 rounded-lg border-2 border-orange-300 bg-white px-3 py-2.5 text-sm text-center font-semibold outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                />
              </div>
              {actualMoq && quantity < actualMoq && (
                <div className="mt-3 text-xs text-orange-700 bg-orange-100 p-3 rounded-xl border-2 border-orange-300 shadow-sm animate-scale-in">
                  <strong className="font-bold">💡 Note:</strong> MOQ is {actualMoq} units. You can order less, but the pool must reach {actualMoq} total to proceed.
                </div>
              )}
            </div>
            <div className="animate-fade-in-up animation-delay-200">
              <label htmlFor="notes" className="block text-sm font-bold text-neutral-900 mb-4">
                Notes <span className="text-neutral-500 font-normal">(optional)</span>
              </label>
              <input 
                id="notes"
                className="w-full rounded-lg border-2 border-orange-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-neutral-400" 
                placeholder="Color, size, customization, etc." 
              />
            </div>
          </div>

          <style jsx>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: linear-gradient(135deg, #f97316, #ea580c);
              cursor: pointer;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              transition: all 0.2s ease;
            }
            .slider::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: linear-gradient(135deg, #f97316, #ea580c);
              cursor: pointer;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              transition: all 0.2s ease;
            }
            .slider::-webkit-slider-thumb:hover {
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
              transform: scale(1.15);
            }
            .slider::-moz-range-thumb:hover {
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
              transform: scale(1.15);
            }
          `}</style>
        </div>

        <div className="md:col-span-1 space-y-3 animate-fade-in-up animation-delay-300">
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
    </div>
  );
}
