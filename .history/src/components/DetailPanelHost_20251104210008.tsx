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

  // Extract key attributes/specifications from detailJson
  const keyAttributes = useMemo(() => {
    const attrs: Array<{ label: string; value: string }> = [];
    
    // Debug: log what we have
    if (typeof window !== 'undefined') {
      console.log('[DetailPanelHost] Full productData:', productData);
      console.log('[DetailPanelHost] detailJson:', detail);
      console.log('[DetailPanelHost] attributes array:', detail?.attributes);
      console.log('[DetailPanelHost] All detailJson keys:', Object.keys(detail || {}));
    }
    
    // Extract from detailJson.attributes array (primary source)
    if (detail?.attributes && Array.isArray(detail.attributes)) {
      detail.attributes.forEach((attr: any) => {
        // Handle both {label, value} and {name, value} formats
        const label = attr.label || attr.name || attr.key;
        const value = attr.value;
        
        if (label && value) {
          // Skip generic platform messages that aren't real attributes
          const skipPatterns = [
            /contact.*supplier/i,
            /every payment.*protected/i,
            /claim.*refund/i,
            /made-in-china\.com/i,
          ];
          
          const shouldSkip = skipPatterns.some(pattern => 
            pattern.test(String(label)) || pattern.test(String(value))
          );
          
          if (!shouldSkip) {
            attrs.push({ 
              label: String(label).trim(), 
              value: String(value).trim() 
            });
          }
        }
      });
    }
    
    // Fallback: Try to extract from other detailJson properties
    if (attrs.length === 0 && detail) {
      const commonFields: Record<string, string> = {
        'modelNo': 'Model No.',
        'model': 'Model',
        'type': 'Type',
        'material': 'Material',
        'rawMaterial': 'Raw Material',
        'size': 'Size',
        'weight': 'Weight',
        'color': 'Color',
        'certification': 'Certification',
        'warranty': 'Warranty',
        'customization': 'Customization',
        'origin': 'Origin',
        'hsCode': 'HS Code',
      };
      
      Object.entries(detail).forEach(([key, value]) => {
        if (commonFields[key] && value && typeof value === 'string' && key !== 'attributes') {
          attrs.push({ label: commonFields[key], value });
        }
      });
    }

    // Add platform origin if not present
    if (!attrs.some(a => a.label.toLowerCase().includes('origin'))) {
      if (platform === 'MADE_IN_CHINA' || platform === 'C1688' || platform === 'ALIBABA') {
        attrs.push({ label: 'Origin', value: 'China' });
      } else if (platform === 'INDIAMART') {
        attrs.push({ label: 'Origin', value: 'India' });
      }
    }

    return attrs;
  }, [detail, platform]);

  return (
    <aside className="w-full">
      <div className="space-y-3">
        
        {/* Shipping to Your Location */}
        <section className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 shadow-sm">
          <header className="p-4 flex items-center justify-between border-b border-blue-200/50">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Shipping to {userLocation?.countryName || 'Your Location'}</h3>
              <p className="text-xs text-gray-600 mt-0.5">Estimated delivery and costs</p>
            </div>
            <span className="text-2xl">🚚</span>
          </header>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-blue-100">
              <span className="text-sm font-medium text-gray-700">Delivery time</span>
              <span className="text-sm font-bold text-gray-900">{shippingEstimate.days} days</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-blue-100">
              <span className="text-sm font-medium text-gray-700">Shipping method</span>
              <span className="text-sm font-bold text-gray-900">{shippingEstimate.method}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-blue-100">
              <span className="text-sm font-medium text-gray-700">Shipping cost</span>
              <span className="text-sm font-bold text-gray-900">{shippingEstimate.cost}</span>
            </div>
            <div className="flex items-start justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Customs</span>
              <span className="text-sm font-bold text-gray-900 text-right">{shippingEstimate.customs}</span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-blue-100 border border-blue-200">
              <p className="text-xs text-blue-900 leading-relaxed">
                📦 Direct shipping from supplier to your address<br/>
                🔒 Tracked & insured delivery
              </p>
            </div>
          </div>
        </section>

        {/* Import Duties & Taxes */}
        <section className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 shadow-sm">
          <header className="p-4 border-b border-purple-200/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Import Duties & Taxes</h3>
                <p className="text-xs text-gray-600 mt-0.5">Estimated for {userLocation?.countryName || 'your country'}</p>
              </div>
            </div>
          </header>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-purple-100">
              <span className="text-sm font-medium text-gray-700">Import duty</span>
              <span className="text-sm font-bold text-gray-900">{dutiesEstimate.rate}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">VAT/GST</span>
              <span className="text-sm font-bold text-gray-900">{dutiesEstimate.vat}</span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-purple-100 border border-purple-200">
              <p className="text-xs text-purple-900 leading-relaxed">
                ⚠️ Duties calculated at checkout based on HS code<br/>
                💡 DDP (Delivered Duty Paid) options may be available
              </p>
            </div>
          </div>
        </section>

        {/* Pool Status */}
        <section className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-sm">
          <header className="p-4 flex items-center justify-between border-b border-orange-200/50">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Pool Buying Status</h3>
              <p className="text-xs text-gray-600 mt-0.5">Join others to unlock better pricing</p>
            </div>
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
              <span>⏰ Pool closes in 3d 11h</span>
              <span className="font-medium text-orange-600">{poolMoq - poolJoined} units needed</span>
            </div>
            <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-base font-bold py-3 hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
              Join Pool & Save
            </button>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                <div className="font-bold text-gray-900">💰 Escrow</div>
                <div className="text-gray-600">Secure payment</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                <div className="font-bold text-gray-900">↩️ Refund</div>
                <div className="text-gray-600">If pool fails</div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods Available */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <header className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💳</span>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Payment Methods</h3>
                <p className="text-xs text-gray-600 mt-0.5">Available in {userLocation?.countryName || 'your region'}</p>
              </div>
            </div>
          </header>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <span key={method} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-sm font-medium text-green-800">
                  {method}
                </span>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-green-900 leading-relaxed">
                ✓ Secure payment processing<br/>
                ✓ Buyer protection included<br/>
                ✓ Multi-currency support
              </p>
            </div>
          </div>
        </section>

        {/* Production & Quality */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <header className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏭</span>
              <h3 className="font-semibold text-lg text-gray-900">Production Details</h3>
            </div>
          </header>
          <dl className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-600">Lead time</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{leadTime}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-600">MOQ</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">
                {moq} {moq === 1 ? 'unit' : 'units'}
              </dd>
            </div>
            {detail?.customization && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Customization</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.customization}</dd>
              </div>
            )}
            {detail?.sampleAvailable && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Samples</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.sampleAvailable}</dd>
              </div>
            )}
            {detail?.certifications && (
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-sm font-medium text-gray-600">Certifications</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{detail.certifications}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Key Attributes */}
        {keyAttributes.length > 0 && (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                <h3 className="font-semibold text-lg bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">
                  Key Attributes
                </h3>
              </div>
            </header>
            <div className="overflow-hidden">
              <div className="grid md:grid-cols-2 divide-x divide-gray-100">
                {/* Split attributes into two columns */}
                {[0, 1].map((colIndex) => {
                  const startIdx = colIndex * Math.ceil(keyAttributes.length / 2);
                  const endIdx = startIdx + Math.ceil(keyAttributes.length / 2);
                  const colAttrs = keyAttributes.slice(startIdx, endIdx);
                  
                  return (
                    <div key={colIndex} className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {colAttrs.map((attr, idx) => (
                            <tr key={`${attr.label}-${idx}`} className="border-b border-gray-100 last:border-0">
                              <th className="text-left font-semibold text-gray-700 py-3 px-4 bg-gray-50/50 w-2/5">
                                {attr.label}
                              </th>
                              <td className="text-gray-900 py-3 px-4">
                                {attr.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Warranty & Returns */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <header className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <h3 className="font-semibold text-lg text-gray-900">Warranty & Returns</h3>
            </div>
          </header>
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">Warranty</span>
              <span className="text-sm font-semibold text-gray-900 text-right">{warrantyInfo}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">Return window</span>
              <span className="text-sm font-semibold text-gray-900 text-right">{returnWindow}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">DOA policy</span>
              <span className="text-sm font-semibold text-gray-900 text-right">7-day replacement</span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <p className="text-xs text-indigo-900 leading-relaxed">
                ✓ Quality inspection before shipping<br/>
                ✓ Defective items replaced or refunded<br/>
                ✓ Buyer protection through platform
              </p>
            </div>
          </div>
        </section>

        {/* Platform & Supplier Trust */}
        {productData?.platform && (
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <header className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏅</span>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Platform Trust Signals</h3>
                  <p className="text-xs text-gray-600 mt-0.5">via {productData.platform.replace('_', ' ')}</p>
                </div>
              </div>
            </header>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Verified supplier on platform</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Transaction protection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Secure escrow payment</span>
              </div>
              {productData.ordersRaw && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-600">📊</span>
                  <span className="text-gray-700">Orders: {productData.ordersRaw}</span>
                </div>
              )}
              {productData.ratingRaw && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-600">⭐</span>
                  <span className="text-gray-700">Rating: {productData.ratingRaw}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Important Information */}
        <section className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-300 shadow-sm">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div className="text-sm font-bold text-amber-900">Before You Order</div>
            </div>
            <ul className="text-sm text-amber-900/90 space-y-1.5 ml-7">
              <li>• All prices are factory quotes - final pricing confirmed after pool closes</li>
              <li>• Lead times start after pool reaches MOQ and payment clears</li>
              <li>• Duties/taxes are buyer&apos;s responsibility unless DDP specified</li>
              <li>• Communicate with supplier for customization details</li>
              <li>• Check local regulations for product compliance</li>
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
  const [userLocation, setUserLocation] = useState<UserLocation | undefined>(undefined);
  const [extractedAttributes, setExtractedAttributes] = useState<Array<{ label: string; value: string }>>([]);
  const currentUrlRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, ProductData>>(new Map());
  const attrsCache = useRef<Map<string, Array<{ label: string; value: string }>>>(new Map());
  
  // Fetch user location on mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const resp = await fetch('/api/me', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.ok && data?.user?.countryCode) {
            // Map country code to name
            const countryNames: Record<string, string> = {
              'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom',
              'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
              'AU': 'Australia', 'NZ': 'New Zealand', 'SG': 'Singapore',
              'MY': 'Malaysia', 'IN': 'India', 'CN': 'China', 'JP': 'Japan',
              'KR': 'South Korea', 'TH': 'Thailand', 'VN': 'Vietnam',
              'PH': 'Philippines', 'ID': 'Indonesia', 'TW': 'Taiwan',
              'HK': 'Hong Kong', 'MX': 'Mexico', 'BR': 'Brazil',
              'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland',
              'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
              'FI': 'Finland', 'PL': 'Poland', 'AE': 'UAE', 'SA': 'Saudi Arabia',
            };
            setUserLocation({
              countryCode: data.user.countryCode,
              countryName: countryNames[data.user.countryCode] || data.user.countryCode,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch user location:', err);
      }
    };
    fetchUserLocation();
  }, []);

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
            <ProductDetailsSidebar productData={productData} userLocation={userLocation} />
          )}
        </div>
      </div>
    </>,
    portalTarget
  );
}
