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
  url?: string;
};

type UserLocation = {
  countryCode?: string;
  countryName?: string;
};

function ProductDetailsSidebar({ productData, userLocation }: { productData?: ProductData; userLocation?: UserLocation }) {
  // Extract details from productData
  const detail = productData?.detailJson || {};
  const moq = productData?.moq || detail?.moq || 2;
  const currency = productData?.currency || detail?.currency || 'USD';
  const platform = productData?.platform || 'ALIBABA';
  
  // Estimate shipping based on user location and platform
  const shippingEstimate = useMemo(() => {
    const country = userLocation?.countryCode || 'US';
    const isAsia = ['CN', 'SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'JP', 'KR', 'TW', 'HK', 'IN'].includes(country);
    const isEurope = ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL'].includes(country);
    const isNorthAmerica = ['US', 'CA', 'MX'].includes(country);
    
    // China-based platforms
    if (['ALIBABA', 'C1688', 'MADE_IN_CHINA', 'TAOBAO'].includes(platform)) {
      if (isAsia) return { days: '5-10', method: 'Express', cost: 'Low', customs: 'Standard' };
      if (isNorthAmerica) return { days: '12-20', method: 'Air/Sea', cost: 'Medium', customs: 'Moderate' };
      if (isEurope) return { days: '15-25', method: 'Air/Sea', cost: 'Medium-High', customs: 'Higher duties' };
      return { days: '20-35', method: 'Sea freight', cost: 'High', customs: 'Variable' };
    }
    // India-based
    if (platform === 'INDIAMART') {
      if (country === 'IN') return { days: '3-7', method: 'Domestic', cost: 'Low', customs: 'None' };
      if (isAsia) return { days: '7-14', method: 'Express', cost: 'Medium', customs: 'Standard' };
      return { days: '15-25', method: 'Air', cost: 'Medium-High', customs: 'Moderate' };
    }
    return { days: '10-20', method: 'Air freight', cost: 'Medium', customs: 'Standard' };
  }, [platform, userLocation]);

  // Import duties estimate
  const dutiesEstimate = useMemo(() => {
    const country = userLocation?.countryCode || 'US';
    const productCategory = detail?.category || 'General';
    
    // Simplified duty rates by country (actual rates vary by HS code)
    const dutyRates: Record<string, { rate: string; vat: string }> = {
      'US': { rate: '0-10%', vat: 'No VAT (state sales tax applies)' },
      'CA': { rate: '0-18%', vat: '5% GST' },
      'GB': { rate: '0-12%', vat: '20% VAT' },
      'DE': { rate: '0-17%', vat: '19% MwSt' },
      'FR': { rate: '0-17%', vat: '20% TVA' },
      'AU': { rate: '0-10%', vat: '10% GST' },
      'SG': { rate: '0%', vat: '9% GST' },
      'IN': { rate: '10-28%', vat: '18% GST' },
      'CN': { rate: '5-30%', vat: '13% VAT' },
    };
    
    return dutyRates[country] || { rate: '5-20%', vat: 'Variable' };
  }, [userLocation, detail]);

  // Pool status (mock - in production get from actual pool)
  const poolProgress = 62;
  const poolMoq = 500;
  const poolJoined = 312;
  
  // Payment methods based on location
  const paymentMethods = useMemo(() => {
    const country = userLocation?.countryCode || 'US';
    const methods = ['Credit/Debit Card', 'Bank Transfer'];
    
    if (['US', 'CA', 'GB', 'AU', 'SG'].includes(country)) methods.push('PayPal');
    if (['CN', 'HK', 'TW'].includes(country)) methods.push('Alipay', 'WeChat Pay');
    if (country === 'IN') methods.push('UPI', 'RazorPay');
    if (['DE', 'AT', 'NL'].includes(country)) methods.push('SEPA', 'Klarna');
    
    return methods;
  }, [userLocation]);

  // Warranty and returns info
  const warrantyInfo = detail?.warranty || 'Standard manufacturer warranty';
  const returnWindow = detail?.returnWindow || '30 days';
  
  // Lead time estimate
  const leadTime = detail?.leadTime || `${Math.ceil(moq / 100) * 3}-${Math.ceil(moq / 100) * 5} days`;

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
                {/* Dynamic width based on pool progress - inline style required */}
                {/* eslint-disable-next-line @microsoft/sdl/react-iframe-missing-sandbox */}
                <div 
                  className={`h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 shadow-sm`}
                  style={{ width: `${poolProgress}%` } as React.CSSProperties}
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
  const [title, setTitle] = useState('');
  const [productData, setProductData] = useState<ProductData | undefined>(undefined);
  const currentUrlRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, ProductData>>(new Map());

  const onClose = useCallback(() => {
    setOpen(false);
    setProductData(undefined);
    setError(null);
    setLoading(false);
    currentUrlRef.current = null;
  }, []);

  const onOpen = useCallback(async (payload: OpenDetailPayload) => {
    const { url, title, productData: passedData } = payload || {} as any;
    if (!url) return;
    setTitle(title || 'Listing details');
    setOpen(true);
    setLoading(true);
    setError(null);
    currentUrlRef.current = url;
    
    // If productData was passed directly, use it
    if (passedData) {
      setProductData(passedData);
      setLoading(false);
      return;
    }

    try {
      // Check cache first
      const cached = cacheRef.current.get(url);
      if (cached) {
        setProductData(cached);
        setLoading(false);
        return;
      }

      // Fetch product data from API
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      try {
        const resp = await fetch(`${base}/api/products/by-url?url=${encodeURIComponent(url)}`, { 
          cache: 'no-store' 
        });
        
        if (!resp.ok) {
          throw new Error(`Failed to load product details (${resp.status})`);
        }
        
        const data = await resp.json();
        if (data?.product) {
          cacheRef.current.set(url, data.product);
          setProductData(data.product);
        } else {
          setError('Product not found');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load details');
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

  // Prefetch support
  useEffect(() => {
    const prefetch = async (e: Event) => {
      const ce = e as CustomEvent<OpenDetailPayload>;
      const url = ce?.detail?.url;
      if (!url || cacheRef.current.has(url)) return;
      
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const resp = await fetch(`${base}/api/products/by-url?url=${encodeURIComponent(url)}`, { 
          cache: 'no-store' 
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.product) {
            cacheRef.current.set(url, data.product);
          }
        }
      } catch {
        // ignore prefetch errors
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
        className={`fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden
      />
      {/* Side panel */}
      <div 
        className={`fixed top-0 right-0 z-[101] h-full w-full sm:w-[48rem] bg-gradient-to-br from-gray-50 to-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base truncate text-gray-900">{title || 'Product Details'}</div>
            {productData?.platform && (
              <div className="text-xs text-gray-500 mt-0.5">
                Source: {productData.platform.replace('_', ' ')}
              </div>
            )}
          </div>
          {currentUrlRef.current && (
            <a
              href={currentUrlRef.current}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Source
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-64 w-full bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 w-full bg-gray-200 rounded-xl animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Failed to load details</div>
              <div className="text-sm text-gray-600 mb-4">{error}</div>
              <button
                onClick={() => onOpen({ url: currentUrlRef.current || '', title })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <ProductDetailsSidebar productData={productData} />
          )}
        </div>
      </div>
    </>,
    portalTarget
  );
}
