"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type OpenDetailPayload = { 
  url: string; 
  title?: string;
  productData?: ProductData;
};

type PriceTier = {
  min: number;
  max?: number;
  price: number;
  originalPrice?: number;
};

type ProductData = {
  title?: string;
  platform?: string;
  price?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  moq?: number;
  moqRaw?: string;
  storeName?: string;
  description?: string;
  priceTiers?: PriceTier[];
  detailJson?: any;
  image?: string;
  ordersRaw?: string;
  ratingRaw?: string;
};

function ProductDetailsSidebar({ productData }: { productData?: ProductData }) {
  // Extract details from productData
  const detail = productData?.detailJson || {};
  const priceTiers = productData?.priceTiers || detail?.priceTiers || [];
  const moq = productData?.moq || detail?.moq || 2;
  const currency = productData?.currency || detail?.currency || 'USD';
  const storeName = productData?.storeName || detail?.storeName || 'Supplier';
  
  // Calculate discount if we have tiers with original prices
  const maxDiscount = useMemo(() => {
    if (!priceTiers.length) return null;
    const discounts = priceTiers
      .filter((t: PriceTier) => t.originalPrice && t.price < t.originalPrice)
      .map((t: PriceTier) => Math.round(((t.originalPrice! - t.price) / t.originalPrice!) * 100));
    return discounts.length ? Math.max(...discounts) : null;
  }, [priceTiers]);

  // Mock pool status data (in production, this would come from actual pool data)
  const poolProgress = 62; // 312 / 500
  const poolMoq = 500;
  const poolJoined = 312;

  return (
    <aside className="w-full">
      <div className="space-y-3">
        {/* Product Image */}
        {productData?.image && (
          <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img 
              src={productData.image} 
              alt={productData.title || 'Product'} 
              className="w-full h-auto object-contain max-h-[300px]"
            />
          </div>
        )}

        {/* Pricing & Tiers */}
        {priceTiers.length > 0 ? (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Pricing Tiers</h3>
              {maxDiscount && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                  {maxDiscount}% OFF
                </span>
              )}
            </header>
            <div className="p-4">
              <ul className="space-y-3">
                {priceTiers.map((tier: PriceTier, idx: number) => (
                  <li key={idx} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="text-sm font-medium text-gray-700">
                      {tier.min}{tier.max ? `–${tier.max}` : '+'} units
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency}{tier.price.toFixed(2)}
                      </div>
                      {tier.originalPrice && tier.originalPrice > tier.price && (
                        <div className="text-xs text-gray-500 line-through">
                          {currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency}{tier.originalPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : productData?.priceMin ? (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Price</h3>
            </header>
            <div className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency}
                {productData.priceMin.toFixed(2)}
                {productData.priceMax && productData.priceMax !== productData.priceMin && 
                  ` - ${currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency}${productData.priceMax.toFixed(2)}`
                }
              </div>
              {productData.price && (
                <div className="text-sm text-gray-600 mt-1">{productData.price}</div>
              )}
            </div>
          </section>
        ) : null}

        {/* Pool Status */}
        <section className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-sm">
          <header className="p-4 flex items-center justify-between border-b border-orange-200/50">
            <h3 className="font-semibold text-lg text-gray-900">Pool Status</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
              MOQ: {poolMoq}
            </span>
          </header>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Progress</span>
              <span className="font-bold text-gray-900">{poolJoined} / {poolMoq} units</span>
            </div>
            <div className="relative">
              <div className="h-2.5 rounded-full bg-orange-100 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 shadow-sm"
                  data-progress={poolProgress}
                  style={{
                    width: `${poolProgress}%`
                  } as React.CSSProperties}
                ></div>
              </div>
              <div className="absolute -top-1 right-0 text-xs font-bold text-orange-600">
                {poolProgress}%
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>⏰ Closes in 3d 11h</span>
              <button className="underline hover:text-orange-600 transition-colors font-medium">
                View contributors
              </button>
            </div>
            <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-base font-bold py-3 hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
              Join Pool
            </button>
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              💰 Funds held in escrow until MOQ is met<br/>
              ↩️ Auto-refund if pool doesn&apos;t reach target
            </p>
          </div>
        </section>

        {/* Key Facts */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <header className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <h3 className="font-semibold text-lg text-gray-900">Product Details</h3>
          </header>
          <dl className="p-4 space-y-3">
            {moq && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">MOQ</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">
                  {moq} {moq === 1 ? 'unit' : 'units'}
                  {productData?.moqRaw && <div className="text-xs text-gray-500 mt-0.5">{productData.moqRaw}</div>}
                </dd>
              </div>
            )}
            {detail?.leadTime && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Lead time</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.leadTime}</dd>
              </div>
            )}
            {detail?.variants && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Variants</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.variants}</dd>
              </div>
            )}
            {detail?.certifications && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Certifications</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.certifications}</dd>
              </div>
            )}
            {detail?.warranty && (
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-sm font-medium text-gray-600">Warranty</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.warranty}</dd>
              </div>
            )}
            {productData?.ordersRaw && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Orders</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{productData.ordersRaw}</dd>
              </div>
            )}
            {productData?.ratingRaw && (
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-sm font-medium text-gray-600">Rating</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{productData.ratingRaw}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Shipping */}
        {detail?.shipping && (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Shipping</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                📦 Direct
              </span>
            </header>
            <div className="p-4 space-y-3 text-sm">
              {detail.shipping.methods && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-600 font-medium">Methods</span>
                  <span className="font-semibold text-gray-900 text-right">{detail.shipping.methods}</span>
                </div>
              )}
              {detail.shipping.dispatchWindow && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-600 font-medium">Dispatch</span>
                  <span className="font-semibold text-gray-900 text-right">{detail.shipping.dispatchWindow}</span>
                </div>
              )}
              {detail.shipping.estimatedDelivery && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-600 font-medium">Delivery</span>
                  <span className="font-semibold text-gray-900 text-right">{detail.shipping.estimatedDelivery}</span>
                </div>
              )}
              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-900 leading-relaxed">
                  📦 Each buyer receives a separate parcel with tracking
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Seller */}
        {storeName && (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Seller</h3>
              {detail?.sellerUrl && (
                <a 
                  href={detail.sellerUrl} 
                  target="_blank" 
                  rel="noreferrer noopener"
                  className="text-sm underline text-purple-600 hover:text-purple-700 font-medium"
                >
                  View store
                </a>
              )}
            </header>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {storeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{storeName}</div>
                  {productData?.platform && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      via {productData.platform.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
              {detail?.seller && (
                <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                  {detail.seller.yearsActive && (
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="font-bold text-gray-900">{detail.seller.yearsActive}</div>
                      <div className="text-xs text-gray-600">Years</div>
                    </div>
                  )}
                  {detail.seller.responseRate && (
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="font-bold text-gray-900">{detail.seller.responseRate}</div>
                      <div className="text-xs text-gray-600">Response</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Description */}
        {productData?.description && (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Description</h3>
            </header>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-6">
                {productData.description}
              </p>
            </div>
          </section>
        )}

        {/* Important Notice */}
        <section className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 shadow-sm">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div className="text-sm font-bold text-amber-900">Important Notes</div>
            </div>
            <ul className="text-sm text-amber-900/90 space-y-1.5 ml-7">
              <li>• Prices may vary based on order quantity and customization</li>
              <li>• Lead times are estimates and subject to supplier confirmation</li>
              <li>• Pool funding is held securely until MOQ is reached</li>
              <li>• Full refund if pool doesn&apos;t meet minimum requirements</li>
            </ul>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function DetailPanelHost() {
  // Defer any DOM/portal rendering until after mount to avoid SSR/CSR mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');
  const currentUrlRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const onClose = useCallback(() => {
    setOpen(false);
    setHtml('');
    setError(null);
    setLoading(false);
    currentUrlRef.current = null;
  }, []);

  const onOpen = useCallback(async (payload: OpenDetailPayload) => {
    const { url, title } = payload || {} as any;
    if (!url) return;
    setTitle(title || 'Listing details');
    setOpen(true);
    setLoading(true);
    setError(null);
    setHtml('');
    currentUrlRef.current = url;
    try {
      // Serve from cache if available
      const cached = cacheRef.current.get(url);
      if (cached) {
        setHtml(cached);
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
          try {
            const resp = await fetch(`${base}/api/external/detail-html?src=${encodeURIComponent(url)}`, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`Failed to load details (${resp.status})`);
            const data = await resp.json();
            const html = typeof data?.html === 'string' ? data.html : '<div class="text-sm text-gray-500">No details available.</div>';
            cacheRef.current.set(url, html);
            setHtml(html);
          } catch (e: any) {
            setError(e?.message || 'Failed to load details');
            setHtml('<div class="text-sm text-gray-500">Network error occurred.</div>');
          }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<OpenDetailPayload>;
      onOpen(ce.detail);
    };
    window.addEventListener('open-detail-panel', handler as EventListener);
    return () => {
      window.removeEventListener('open-detail-panel', handler as EventListener);
    };
  }, [onOpen]);

  // Prefetch support: prefetch-detail-panel
  useEffect(() => {
    const prefetch = async (e: Event) => {
      const ce = e as CustomEvent<OpenDetailPayload>;
      const url = ce?.detail?.url;
      if (!url) return;
      if (cacheRef.current.has(url) || pendingRef.current.has(url)) return;
      pendingRef.current.add(url);
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const resp = await fetch(`${base}/api/external/detail-html?src=${encodeURIComponent(url)}`, { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const html = typeof data?.html === 'string' ? data.html : '';
          if (html) cacheRef.current.set(url, html);
        }
      } catch {
        // ignore
      } finally {
        pendingRef.current.delete(url);
      }
    };
    window.addEventListener('prefetch-detail-panel', prefetch as EventListener);
    return () => {
      window.removeEventListener('prefetch-detail-panel', prefetch as EventListener);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/30 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden
      />
      {/* Side panel */}
      <div className={`fixed top-0 right-0 z-[101] h-full w-full sm:w-[44rem] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-gradient-to-r from-white to-gray-50">
          <div className="font-medium text-sm truncate">{title || 'Details'}</div>
          {currentUrlRef.current ? (
            <a
              href={currentUrlRef.current}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs underline text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              View on source
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-black text-sm px-2 py-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 drawer-scroll">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-40 skeleton rounded" />
              <div className="h-48 w-full skeleton rounded" />
              <div className="h-4 w-2/3 skeleton rounded" />
              <div className="h-4 w-1/2 skeleton rounded" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <ProductDetailsSidebar />
          )}
        </div>
      </div>
    </>,
    portalTarget
  );
}
