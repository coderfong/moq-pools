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
            <div className="size-36 shrink-0 overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100 shadow-lg hover:scale-110 hover:rotate-2 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-300/50 relative group/img">
              {img ? (
                <>
                  <img src={img} alt={actualTitle} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <h2 className="truncate font-extrabold text-2xl bg-gradient-to-r from-gray-900 via-orange-700 to-amber-600 bg-clip-text text-transparent leading-tight">
                  {actualTitle}
                </h2>
                {actualPrice && (
                  <div className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg">
                    <div className="text-white font-bold text-sm">Best Price</div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <div className="text-xs text-neutral-600 font-medium">Supplier</div>
                    <div className="text-sm font-bold text-neutral-900 truncate">{actualSupplier || '—'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div>
                    <div className="text-xs text-neutral-600 font-medium">MOQ</div>
                    <div className="text-sm font-bold text-neutral-900">{actualMoq ? `≥${actualMoq}` : 'Varies'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
                  {formatCurrency(actualPrice)}
                </div>
                <div className="text-sm text-neutral-500 font-medium">per unit</div>
              </div>

              {sourceUrl ? (
                <div className="mt-4">
                  <a 
                    href={sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 rounded-lg border-2 border-orange-300 text-sm text-orange-700 hover:text-orange-800 font-semibold transition-all duration-200 hover:shadow-lg group/link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Original Listing
                    <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="animate-fade-in-up animation-delay-100">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Quantity
                </label>
                <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg">
                  <span className="text-white font-bold text-lg">{quantity}</span>
                  <span className="text-white/80 text-xs ml-1">{quantity === 1 ? 'unit' : 'units'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  aria-label="Select quantity"
                  className="flex-1 h-3 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full appearance-none cursor-pointer slider shadow-inner"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f59e0b ${((quantity - 1) / (maxQuantity - 1)) * 100}%, #fde68a ${((quantity - 1) / (maxQuantity - 1)) * 100}%, #fef3c7 100%)`
                  }}
                />
                <input 
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                  aria-label="Quantity input"
                  className="w-24 rounded-xl border-2 border-orange-300 bg-white px-4 py-3 text-base text-center font-bold outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                <span>Min: 1</span>
                <span>Max: {maxQuantity}</span>
              </div>
              {actualMoq && quantity < actualMoq && (
                <div className="mt-4 flex items-start gap-2 text-xs text-orange-800 bg-gradient-to-r from-orange-100 to-amber-100 p-4 rounded-xl border-2 border-orange-300 shadow-md animate-scale-in">
                  <svg className="w-5 h-5 shrink-0 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-bold mb-1">Pool Purchase Notice</div>
                    <div>MOQ is <span className="font-bold">{actualMoq}</span> units. You can order less, but the pool must reach <span className="font-bold">{actualMoq}</span> total units to proceed with manufacturing.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="animate-fade-in-up animation-delay-200">
              <label htmlFor="notes" className="flex items-center gap-2 text-sm font-bold text-neutral-900 mb-4">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Special Requirements
                <span className="text-neutral-500 font-normal text-xs">(optional)</span>
              </label>
              <textarea 
                id="notes"
                rows={5}
                className="w-full rounded-xl border-2 border-orange-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-neutral-400 shadow-sm hover:shadow-md resize-none" 
                placeholder="Specify color preferences, size variations, custom packaging, or any other special requirements for your order..."
              />
              <div className="mt-2 text-xs text-neutral-500 italic">These notes will be shared with the supplier</div>
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
