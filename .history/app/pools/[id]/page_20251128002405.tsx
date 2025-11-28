import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { platformLabel } from '@/lib/sourceLinks';
import { CATEGORIES } from '@/lib/categories';
import { SHARED_CATEGORIES, toKey, type SharedCategoryNode } from '@/lib/sharedTaxonomy';
import HeroAutoFillClient from './HeroAutoFillClient';
import TrackProductView from './TrackProductView';
import PoolTimerInjector from './PoolTimerInjector';
import LivePoolProgress from './LivePoolProgress';
import SocialShare from '../../../src/components/SocialShare';
import ProductReviews from '../../../src/components/ProductReviews';

export const dynamic = 'force-dynamic';

export default async function PoolDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { id } = params;
  // If Prisma isn't available (e.g., missing DATABASE_URL), this page cannot load data
  if (!prisma) return notFound();
  const listing = await prisma.savedListing.findUnique({ where: { id } }) as any;
  if (!listing) return notFound();
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  const toTitleCase = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeTierRange = (range: string) => {
    let s = String(range || '');
    // pieces -> pcs
    s = s.replace(/\bpieces?\b/gi, 'pcs').replace(/\bpc\b/gi, 'pcs');
    // >= to ≥ and ensure a space after
    s = s.replace(/&gt;=|>=/g, '≥');
    s = s.replace(/≥\s*(\d)/g, '≥ $1');
    // hyphen range -> en dash, trimmed spacing around dash
    s = s.replace(/\s*[\-–]\s*/g, '–');
    // collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };
  const computeTierBounds = (range: string): { min: number; max: number | 'inf' } => {
    const raw = String(range || '');
    // Normalize common encodings
    const s = raw.replace(/&gt;=/g, '>=').trim();
    const ge = s.match(/(?:≥|>=)\s*(\d+)/);
    if (ge) {
      const n = parseInt(ge[1], 10);
      return { min: isFinite(n) ? n : 1, max: 'inf' };
    }
    const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      return { min: isFinite(a) ? a : 1, max: isFinite(b) ? b : 'inf' };
    }
    const one = s.match(/\b(\d+)\b/);
    if (one) {
      const n = parseInt(one[1], 10);
      return { min: isFinite(n) ? n : 1, max: isFinite(n) ? n : 'inf' };
    }
    return { min: 1, max: 'inf' };
  };
  // Fetch dynamic product details with caching (best-effort; falls back to SavedListing fields)
  const force = String(searchParams?.refresh || '').toLowerCase() === '1' || String(searchParams?.refresh || '').toLowerCase() === 'true';
  let detail: any = null;
  try {
    // TEMPORARY: Use cached data only to preserve existing good data
    // Don't re-scrape automatically as it's currently overwriting good data with empty data
    detail = listing.detailJson;
    
    // Only refresh if explicitly requested via ?refresh=1
    if (force) {
      const mod = await import('@/lib/providers/detail');
      detail = await mod.refreshProductDetail(listing);
    }
  } catch {}
  // Dev: surface parser debug breadcrumbs when available
  try {
    if (process.env.NODE_ENV !== 'production' && Array.isArray(detail?.debug) && detail.debug.length) {
      // eslint-disable-next-line no-console
      console.debug('[detail]', detail.debug);
    }
  } catch {}
  // Normalize and merge critical fields to guarantee price/tiers for UI
  let normalized: any = null;
  let isWeak: boolean = false;
  try {
    const { normalizeDetail, isWeakDetail } = await import('@/lib/detail-contract');
    normalized = normalizeDetail(
      {
        title: String(detail?.title || ''),
        priceText: detail?.priceText ?? null,
        priceTiers: Array.isArray(detail?.priceTiers) ? detail.priceTiers : [],
        soldCount: (detail as any)?.soldCount ?? null,
        attributes: Array.isArray(detail?.attributes) ? (detail.attributes as Array<{label:string; value:string}>).map(p => [String(p.label||''), String(p.value||'')] as [string,string]) : [],
        packaging: Array.isArray(detail?.packaging) ? (detail.packaging as Array<{name:string; value:string}>).map(p => [String(p.name||''), String(p.value||'')] as [string,string]) : [],
        protections: Array.isArray(detail?.protections) ? (detail.protections as Array<{header?:string; body?:string}>).map(p => [p.header, p.body].filter(Boolean).join(': ').trim()).filter(Boolean) : [],
        supplier: { name: (detail as any)?.supplier?.name ?? null, logo: (detail as any)?.supplier?.logo ?? null },
        moqText: (detail as any)?.moqText || undefined,
        heroImage: (detail as any)?.heroImage ?? null,
      },
      {
        title: String(listing.title || ''),
        priceRaw: (listing as any)?.priceRaw ?? null,
        priceMin: (listing as any)?.priceMin ?? null,
        priceMax: (listing as any)?.priceMax ?? null,
        currency: (listing as any)?.currency ?? null,
        ordersRaw: (listing as any)?.ordersRaw ?? null,
        image: (listing as any)?.image ?? null,
      }
    );
    if (!detail?.priceText && normalized.priceText) detail.priceText = normalized.priceText;
    if ((!detail?.priceTiers || detail.priceTiers.length === 0) && normalized.priceTiers?.length) detail.priceTiers = normalized.priceTiers;
    if (!detail?.heroImage && normalized?.heroImage) detail.heroImage = normalized.heroImage;
    try { isWeak = isWeakDetail(normalized as any); } catch {}
    
    // SYNTHETIC ATTRIBUTES: When scraping is blocked, generate useful attributes from listing data
    if (isWeak && (!detail?.attributes || detail.attributes.length === 0)) {
      const syntheticAttrs: Array<{label: string; value: string}> = [];
      
      // Add price range if available
      if (listing.priceRaw || listing.priceMin) {
        syntheticAttrs.push({
          label: 'Price Range',
          value: listing.priceRaw || (listing.priceMin && listing.priceMax ? `${listing.currency || 'US$'}${listing.priceMin} - ${listing.currency || 'US$'}${listing.priceMax}` : `${listing.currency || 'US$'}${listing.priceMin}`)
        });
      }
      
      // Add platform
      if (listing.platform) {
        syntheticAttrs.push({
          label: 'Source Platform',
          value: listing.platform === 'ALIBABA' ? 'Alibaba.com' : listing.platform === 'INDIAMART' ? 'IndiaMART' : listing.platform
        });
      }
      
      // Add MOQ from normalized data
      if (normalized.moq && normalized.moq > 1) {
        syntheticAttrs.push({
          label: 'Minimum Order',
          value: `${normalized.moq} pieces`
        });
      }
      
      // Add sold count if available
      if (listing.ordersRaw || normalized.soldCount) {
        syntheticAttrs.push({
          label: 'Orders',
          value: listing.ordersRaw || `${normalized.soldCount} sold`
        });
      }
      
      if (syntheticAttrs.length > 0) {
        detail.attributes = syntheticAttrs;
      }
    }
    
    // SYNTHETIC PACKAGING: Add basic shipping/packaging info
    if (isWeak && (!detail?.packaging || detail.packaging.length === 0)) {
      detail.packaging = [
        { name: 'Selling Units', value: 'Single item' },
        { name: 'Package Type', value: 'Standard export packaging' },
        { name: 'Lead Time', value: '7-14 days after payment' }
      ];
    }
    
    // SYNTHETIC PROTECTIONS: Add standard buyer protections
    if (isWeak && (!detail?.protections || detail.protections.length === 0)) {
      detail.protections = [
        {
          header: 'Secure Payment',
          body: 'Your payment information is encrypted and secure. We never share your card details.'
        },
        {
          header: 'Quality Assurance',
          body: 'Products are verified before shipment. Contact us within 7 days if you receive defective items.'
        },
        {
          header: 'Buyer Protection',
          body: 'Full refund if product is not as described or doesn\'t arrive on time.'
        }
      ];
    }
  } catch {}

  // If the cached detail is weak and user didn't explicitly force refresh, perform a one-time live refresh
  if (!force) {
    try {
      if (isWeak) {
        const { refreshProductDetail } = await import('@/lib/providers/detail');
        const fresh = await refreshProductDetail(listing).catch(() => null);
        if (fresh) {
          detail = fresh;
          try {
            const { normalizeDetail, isWeakDetail } = await import('@/lib/detail-contract');
            normalized = normalizeDetail(
              {
                title: String(detail?.title || ''),
                priceText: detail?.priceText ?? null,
                priceTiers: Array.isArray(detail?.priceTiers) ? detail.priceTiers : [],
                soldCount: (detail as any)?.soldCount ?? null,
                attributes: Array.isArray(detail?.attributes) ? (detail.attributes as Array<{label:string; value:string}>).map(p => [String(p.label||''), String(p.value||'')] as [string,string]) : [],
                packaging: Array.isArray(detail?.packaging) ? (detail.packaging as Array<{name:string; value:string}>).map(p => [String(p.name||''), String(p.value||'')] as [string,string]) : [],
                protections: Array.isArray(detail?.protections) ? (detail.protections as Array<{header?:string; body?:string}>).map(p => [p.header, p.body].filter(Boolean).join(': ').trim()).filter(Boolean) : [],
                supplier: { name: (detail as any)?.supplier?.name ?? null, logo: (detail as any)?.supplier?.logo ?? null },
                moqText: (detail as any)?.moqText || undefined,
                heroImage: (detail as any)?.heroImage ?? null,
              },
              {
                title: String(listing.title || ''),
                priceRaw: (listing as any)?.priceRaw ?? null,
                priceMin: (listing as any)?.priceMin ?? null,
                priceMax: (listing as any)?.priceMax ?? null,
                currency: (listing as any)?.currency ?? null,
                ordersRaw: (listing as any)?.ordersRaw ?? null,
                image: (listing as any)?.image ?? null,
              }
            );
            if (!detail?.priceText && normalized.priceText) detail.priceText = normalized.priceText;
            if ((!detail?.priceTiers || detail.priceTiers.length === 0) && normalized.priceTiers?.length) detail.priceTiers = normalized.priceTiers;
            if (!detail?.heroImage && normalized?.heroImage) detail.heroImage = normalized.heroImage;
            try { isWeak = isWeakDetail(normalized as any); } catch {}
          } catch {}
        }
      }
    } catch {}
  }
  const gallery = Array.isArray(detail?.gallery) ? detail!.gallery! : [];
  // Title sanitizer: remove file extensions and trailing long numeric IDs to match product card cleaning
  function cleanTitleString(s?: string | null): string {
    let t = String(s || '').trim();
    if (!t) return t;
    // Remove patterns like "... 1601127928773.html" at the end in one go
    t = t.replace(/\b\d{8,}\.(?:html?|php|asp|aspx|shtml)\b\s*$/i, '');
    // Remove common file extensions
    t = t.replace(/\.(html?|php|asp|aspx|shtml)\b/ig, '');
    // Remove trailing long numeric IDs
    t = t.replace(/[\s_-]*\b\d{8,}\b$/g, '');
    // Normalize Inch
    t = t.replace(/\bInches?\b/ig, 'inch');
    // Collapse whitespace
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }
  // Compute the same thumbnail src logic used on /products
  function isSeedish(u?: string | null) {
    if (!u) return false;
    try {
      const dec = decodeURIComponent(u);
      return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(dec);
    } catch {
      return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(String(u));
    }
  }
  async function computeHeroImage(): Promise<string> {
    const { resolveFallbackImage, isBadImageHashFromPath } = await import('@/lib/imageFallbacks');
    const raw: string = String(listing.image || '');
    const hero: string = String((detail as any)?.heroImage || '');
    const title: string = String(listing.title || '');
    const desc: string = String(listing.description || '');
    const fallback = resolveFallbackImage(raw, title, desc) || '';
    const preferIM = String((listing as any)?.platform || '').toUpperCase() === 'INDIAMART';
    const isAli = String((listing as any)?.platform || '').toUpperCase() === 'ALIBABA';

    // 1) Prefer already-cached listing image if valid
    if (raw && raw.startsWith('/cache/') && !isBadImageHashFromPath(raw)) {
      return raw;
    }

    // 2) If parser resolved a heroImage, try caching and use it
    if (hero) {
      if (hero.startsWith('/cache/') && !isBadImageHashFromPath(hero)) return hero;
      if (hero.startsWith('http://') || hero.startsWith('https://') || hero.startsWith('//')) {
        try {
          const { cacheExternalImage } = await import('@/lib/imageCache');
          const { localPath } = await cacheExternalImage(hero, { preferJpgForIndiaMart: preferIM });
          if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
        } catch {}
      }
    }

    // 3) If listing image is a remote URL, attempt to cache it to /cache
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//'))) {
      try {
        const { cacheExternalImage } = await import('@/lib/imageCache');
        const { localPath } = await cacheExternalImage(raw, { preferJpgForIndiaMart: preferIM });
        if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
      } catch {}
    }

    // 3b) Alibaba-only: try resolving best detail image and cache it so hero uses /cache path
    if (isAli && listing.url) {
      try {
        const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
        const best = await getAlibabaDetailFirstJpg(String(listing.url));
        if (best) {
          const { cacheExternalImage } = await import('@/lib/imageCache');
          const { localPath } = await cacheExternalImage(best);
          if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
          // As a fallback, if caching fails but best is a direct URL, return it
          if (/^https?:\/\//i.test(best)) return best;
        }
        // Secondary fallback: call the generic resolver API which also caches to /cache
        try {
          const apiPath = `/api/external/resolve-img?src=${encodeURIComponent(String(listing.url))}`;
          let abs = apiPath;
          try {
            const h = headers();
            const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
            const proto = h.get('x-forwarded-proto') || (String(hostH).includes('localhost') || String(hostH).includes('127.0.0.1') ? 'http' : 'https');
            abs = `${proto}://${hostH}${apiPath}`;
          } catch {
            const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
            abs = `${base}${apiPath}`;
          }
          const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
          if (resp?.ok) {
            const data = await resp.json().catch(() => null);
            const lp = data?.localPath as string | undefined;
            if (lp && !isBadImageHashFromPath(lp)) return lp;
          }
        } catch {}
      } catch {}
    }

    // 4) Fallback (seed or computed placeholder)
    return fallback || raw || '/seed/sleeves.jpg';
  }

  const titleRaw = cleanTitleString(detail?.title || listing.title || '');
  const titleText = esc(titleRaw);
  const imgSrc = await computeHeroImage();
  const priceTiers: Array<{ price: string; range: string }> = Array.isArray((detail as any)?.priceTiers) ? (detail as any).priceTiers : [];
  const samplePrice: string = (detail as any)?.samplePrice ? esc(String((detail as any).samplePrice)) : '';
  const priceText: string = (detail as any)?.priceText ? esc(String((detail as any).priceText)) : '';
  // Fallback: derive a displayable price from SavedListing fields when detail parsing didn't yield a price
  const listingPriceFallback: string = (() => {
    try {
      // Prefer raw captured price text if present
      const raw = (listing as any)?.priceRaw ? String((listing as any).priceRaw) : '';
      if (raw) return esc(raw);
      const cur = String((listing as any)?.currency || '').toUpperCase();
      const min = (listing as any)?.priceMin != null ? Number((listing as any).priceMin) : undefined;
      const max = (listing as any)?.priceMax != null ? Number((listing as any).priceMax) : undefined;
      if (min == null && max == null) return '';
      const sym = (() => {
        if (cur === 'USD') return 'US$';
        if (cur === 'CNY' || cur === 'RMB') return '¥';
        if (cur === 'INR' || cur === '₹' || cur === 'RS' || cur === 'RS.') return '₹';
        return cur || '';
      })();
      const fmt = (n: number) => {
        const v = Number(n);
        if (!isFinite(v)) return '';
        // Avoid excessive decimals; most marketplace prices are 0-2 decimals
        return v % 1 === 0 ? v.toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      if (min != null && max != null && isFinite(min) && isFinite(max) && min !== max) {
        return `${sym ? sym + ' ' : ''}${fmt(min)} - ${sym ? sym + ' ' : ''}${fmt(max)}`;
      }
      const one = (min != null && isFinite(min)) ? min : (max != null && isFinite(max)) ? max : undefined;
      if (one != null) {
        return `${sym ? sym + ' ' : ''}${fmt(one)}`;
      }
      return '';
    } catch { return ''; }
  })();
  const moqQtyText: string = (detail as any)?.moqText ? esc(String((detail as any).moqText)) : '';
  const ratingVal: number | undefined = typeof (detail as any)?.rating?.value === 'number' ? (detail as any).rating.value : undefined;
  const reviewsCount: number | undefined = (detail as any)?.rating?.count != null ? Number((detail as any).rating.count) : undefined;
  const soldCount: number | undefined = (() => {
    const fromDetail = (detail as any)?.soldCount;
    if (fromDetail != null && isFinite(Number(fromDetail))) return Number(fromDetail);
    // Fallback: parse from SavedListing.ordersRaw like "10 sold" or "50 orders"
    try {
      const raw = (listing as any)?.ordersRaw ? String((listing as any).ordersRaw) : '';
      const m = raw.match(/(\d[\d,]*)\s*(orders?|sold)\b/i);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10);
        if (isFinite(n)) return n;
      }
    } catch {}
    return undefined;
  })();
  const contactLink: string = listing.url ? esc(String(listing.url)) : '';
  const protections: Array<{ header?: string; body?: string }> = Array.isArray((detail as any)?.protections) ? (detail as any).protections : [];
  const variations: Array<{ img?: string; label: string }> = Array.isArray((detail as any)?.variations) ? (detail as any).variations : [];
  const customizationOptions: Array<{ name: string; addOn?: string; moq?: string }> = Array.isArray((detail as any)?.customizationOptions) ? (detail as any).customizationOptions : [];
  const supplierAbilities: string[] = Array.isArray((detail as any)?.supplierAbilities) ? (detail as any).supplierAbilities : [];
  const shippingNote: string = (detail as any)?.shippingNote ? esc(String((detail as any).shippingNote)) : '';
  const companyLogo: string = (detail as any)?.supplier?.logo ? esc(String((detail as any).supplier.logo)) : '';
  const companyLink: string = (detail as any)?.supplier?.profileUrl
    ? esc(String((detail as any).supplier.profileUrl))
    : ((detail as any)?.supplier?.profileLink ? esc(String((detail as any).supplier.profileLink)) : '');
  const supplierName: string = (detail as any)?.supplier?.name ? esc(String((detail as any).supplier.name)) : '';
  const actions = { chatLabel: 'Chat Now' };
  // Timer deadline: prefer Pool.deadlineAt for the associated product; fallback to 5 days (to match Products page)
  let timerDeadlineISO: string = '';
  try {
    const prod = await prisma.product.findFirst({
      where: { sourceUrl: String((listing as any)?.url || '') },
      select: { pool: { select: { deadlineAt: true } } },
    }) as any;
    if (prod?.pool?.deadlineAt) {
      timerDeadlineISO = new Date(prod.pool.deadlineAt).toISOString();
    }
  } catch {}
  if (!timerDeadlineISO) {
    timerDeadlineISO = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Build details sections
  const keyAttrSec = (Array.isArray(detail?.attributes) && detail.attributes.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Key attributes</h2>
                <div class=\"overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg\">
                  <div class=\"grid md:grid-cols-2 divide-x divide-orange-100\">
                    <table class=\"sec-table w-full text-sm\"><tbody>
                        ${detail.attributes.slice(0, Math.ceil(detail.attributes.length / 2)).map((r: any, i: number) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i}\"><th class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                    </tbody></table>
                    <table class=\"sec-table w-full text-sm\"><tbody>
                        ${detail.attributes.slice(Math.ceil(detail.attributes.length / 2)).map((r: any, i: number) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i + Math.ceil(detail.attributes.length / 2)}\"><th class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                    </tbody></table>
                  </div>
                </div>
              </section>` : '';
  const keyAttrSec2 = (Array.isArray(detail?.attributes) && detail.attributes.length) ? `
                <section class=\"mt-8 h-full flex flex-col\">
                  <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Key attributes</h2>
                  <div class=\"overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg flex-1\">
                    <div class=\"grid md:grid-cols-2 divide-x divide-orange-100 h-full\">
                      <table class=\"sec-table w-full text-sm\"><tbody>
                          ${detail.attributes.slice(0, Math.ceil(detail.attributes.length / 2)).map((r: any, i: number) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i}\"><th class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                      </tbody></table>
                      <table class=\"sec-table w-full text-sm\"><tbody>
                          ${detail.attributes.slice(Math.ceil(detail.attributes.length / 2)).map((r: any, i: number) => `<tr key=\"${esc(r.label)}|${esc(r.value)}|${i + Math.ceil(detail.attributes.length / 2)}\"><th class=\"th-label\">${esc(toTitleCase(r.label))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                      </tbody></table>
                    </div>
                  </div>
                </section>` : '';

  const variationsSec = (Array.isArray(variations) && variations.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Variations</h2>
                <div class=\"overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg\">
                  <div class=\"p-4 grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-4\">
                    ${variations.map((v: any, i: number) => `
                      <figure key=\"var-${i}\" class=\"flex flex-col items-center text-center p-3 rounded-xl hover:bg-orange-50/30 transition-colors\">
                        ${v.img ? `<img src=\"${esc(String(v.img || '').replace(/^\/\//, 'https://'))}\" alt=\"${esc(String(v.label || ''))}\" class=\"w-24 h-24 object-contain rounded-lg border-2 border-orange-200\" referrerpolicy=\"no-referrer\" />` : ''}
                        <figcaption class=\"mt-2 text-xs text-gray-700 line-clamp-2 font-medium\">${esc(String(v.label || ''))}</figcaption>
                      </figure>
                    `).join('')}
                  </div>
                </div>
              </section>` : '';

  const packagingSec = (Array.isArray(detail?.packaging) && detail.packaging.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Packaging and delivery</h2>
                <div class=\"overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg\">
                  <table class=\"sec-table w-full text-sm\"><tbody>
                      ${detail.packaging.map((r: any, i: number) => `<tr key=\"${esc(r.name)}|${esc(r.value)}|${i}\"><th class=\"th-label\">${esc(toTitleCase(r.name))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const protectionsSec = (Array.isArray(protections) && protections.length) ? `
              <section class=\"mt-8\">
                <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Protections</h2>
                <div class=\"grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4\">
                  ${protections.map((p, i) => `
                    <div key=\"prot-${i}\" class=\"prot-card bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl p-5 shadow-lg\"> 
                      <div class=\"font-bold text-gray-900 text-base\">${p.header ? esc(p.header) : ''}</div>
                      <p class=\"text-sm text-gray-700 mt-2 leading-relaxed\">${p.body ? esc(p.body) : ''}</p>
                    </div>
                  `).join('')}
                </div>
              </section>` : '';

  const supplierSec = supplierName ? `
              <section class=\"mt-8\">
                <h2 class=\"text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-4\">Supplier</h2>
                <div class=\"supplier-card rounded-2xl p-6 shadow-xl flex items-center gap-4\">
                  ${companyLogo ? `<img src=\"${companyLogo}\" alt=\"${supplierName}\" class=\"w-16 h-16 rounded-full border-2 border-orange-300 shadow-md\" referrerpolicy=\"no-referrer\" />` : '<div class=\"w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-md\">🏭</div>'}
                  <div class=\"flex-1 min-w-0\">
                    <div class=\"font-bold text-xl text-gray-900 truncate\">${supplierName}</div>
                    ${companyLink ? `<a href=\"${companyLink}\" target=\"_blank\" class=\"text-sm text-orange-600 hover:text-orange-700 font-medium underline mt-1 inline-block\">View supplier profile →</a>` : ''}
                  </div>
                </div>
              </section>` : '';

  // Supplier section moved to be below key attributes (full width)
  const rightCol = [variationsSec, packagingSec, protectionsSec].filter(Boolean).join('\n');
  const detailsBlock = keyAttrSec && rightCol
    ? `\n<div class=\"mt-8 grid md:grid-cols-2 gap-6 items-stretch\">\n${keyAttrSec}\n<div class=\"space-y-8 h-full\">\n${rightCol}\n</div>\n</div>\n${supplierSec}`
    : keyAttrSec 
      ? `${keyAttrSec}\n${supplierSec}\n${rightCol}`
      : [packagingSec, protectionsSec, supplierSec].filter(Boolean).join('\n');

  const html = `
          <style>
            /* Section tables and cards styling */
            .sec-table th.th-label { 
              text-align:left; 
              color:#111827; 
              font-weight:700; 
              padding:14px 18px; 
              background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
              border-bottom: 2px solid #fb923c;
              font-size: 0.875rem;
            }
            .sec-table td { 
              padding:14px 18px; 
              color:#4b5563;
              border-bottom: 1px solid #fed7aa;
              font-size: 0.875rem;
            }
            .sec-table tr:last-child th,
            .sec-table tr:last-child td {
              border-bottom: none;
            }
            .sec-table tr:hover {
              background: linear-gradient(to right, rgba(251, 146, 60, 0.08), rgba(251, 191, 36, 0.08));
            }
            .prot-card { 
              transition: all .3s ease;
              border: 2px solid #fed7aa;
            }
            .prot-card:hover { 
              box-shadow: 0 20px 40px rgba(251, 146, 60, 0.2);
              transform: translateY(-2px);
              border-color: #fb923c;
            }
            
            /* Pool hero enhancements */
            .pool-hero {
              background: linear-gradient(to bottom, rgba(255, 247, 237, 0.4), white);
              padding: 2rem;
              border-radius: 1.5rem;
              margin-bottom: 2rem;
            }
            .pool-hero-left {
              position: sticky;
              top: 20px;
            }
            .btn-mag {
              background: linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%);
              transition: all 0.3s ease;
              box-shadow: 0 10px 30px rgba(249, 115, 22, 0.3);
              border: 2px solid #fb923c;
            }
            .btn-mag:hover {
              background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%);
              transform: scale(1.05);
              box-shadow: 0 15px 40px rgba(249, 115, 22, 0.4);
            }
            
            /* Supplier card */
            .supplier-card {
              background: linear-gradient(135deg, #fff7ed 0%, white 100%);
              border: 2px solid #fb923c;
              transition: all 0.3s ease;
            }
            .supplier-card:hover {
              box-shadow: 0 20px 40px rgba(251, 146, 60, 0.2);
              transform: translateY(-2px);
            }
          </style>
          
                ${(() => {
                  const parts: string[] = [];
                  if (typeof ratingVal === 'number' && !isNaN(ratingVal)) {
                    const r = ratingVal.toFixed(1);
                    const rc = (typeof reviewsCount === 'number' && isFinite(reviewsCount)) ? ` (${reviewsCount.toLocaleString('en-US')} review${reviewsCount === 1 ? '' : 's'})` : '';
                    parts.push(`${r}${rc}`);
                  } else if (typeof reviewsCount === 'number' && isFinite(reviewsCount)) {
                    parts.push(`${reviewsCount.toLocaleString('en-US')} review${reviewsCount === 1 ? '' : 's'}`);
                  }
                  if (typeof soldCount === 'number' && isFinite(soldCount)) {
                    parts.push(`${soldCount.toLocaleString('en-US')} sold`);
                  }
                  return parts.length ? `<div class=\"mt-1 text-sm text-gray-700\">${parts.map(esc).join(' \u2022 ')}</div>` : '';
                })()}

              <div class="mt-2 text-black">
                ${priceTiers.length ? (() => {
                  // Build stylized tier map: place each price marker at the middle of its quantity range
                  type T = { price: string; min: number; max: number | 'inf'; mid: number };
                  // Parse and then sort tiers by ascending min to ensure correct segment ordering
                  let raw: T[] = priceTiers.map((t: any) => {
                    const b = computeTierBounds(String(t.range || ''));
                    return { price: String(t.price || ''), min: b.min, max: b.max } as any;
                  });
                  raw = raw.sort((a, b) => a.min - b.min);
                  // Progress must start from 0
                  const start = 0;
                  const finiteMaxesAll = raw.map(r => (r.max === 'inf' ? NaN : Number(r.max))).filter(n => Number.isFinite(n)) as number[];
                  const finiteMaxes = Array.from(new Set(finiteMaxesAll)).sort((a,b)=>a-b);
                  const lastMin = raw.length ? raw[raw.length - 1].min : start;
                  const endFinite = finiteMaxes.length ? finiteMaxes[finiteMaxes.length - 1] : lastMin;
                  // Always create a small virtual tail to avoid markers hugging the right edge,
                  // not only for ∞ tiers. This also fixes single-tier cases like "2–2".
                  const prevFinite = finiteMaxes.length >= 2 ? finiteMaxes[finiteMaxes.length - 2] : start;
                  const lastSegWidth = Math.max(1, endFinite - prevFinite);
                  const baseSpan = Math.max(1, endFinite - start);
                  const domainTail = Math.max(lastSegWidth, Math.round(baseSpan * 0.2));
                  const domainEnd = endFinite + domainTail;
                  const tiersMid = raw.map(r => ({
                    ...r,
                    mid: (r.max === 'inf' ? (r.min + domainEnd) / 2 : (r.min + Number(r.max)) / 2)
                  }));
                  const pct = (q: number) => {
                    const denom = Math.max(1, (domainEnd - start));
                    return Math.max(0, Math.min(100, ((q - start) / denom) * 100));
                  };
                  // Stops: baseline start (0), all tier minimums, and each finite maximum (exclude 'inf')
                  // Numeric ticks under the bar should prefer the next tier's minimum over the previous tier's maximum
                  // to avoid adjacent overlaps like 499 vs 500; hence only include 0 and all tier minimums (deduped).
                  const stops = [
                      start,
                      ...raw.map(r => r.min)
                    ]
                    .filter((v, i, arr) => arr.indexOf(v) === i) // unique
                    .sort((a, b) => a - b);
                  return `
                  <style>
                    .tp-inline .marker{transform:translateX(-50%); top:20px}
                    .tp-inline .chip{
                      background: linear-gradient(135deg, rgba(255, 247, 237, 0.98) 0%, rgba(255, 251, 235, 0.98) 100%);
                      border: 2px solid #fb923c;
                      box-shadow: 0 10px 30px rgba(251, 146, 60, 0.25);
                      border-radius: 9999px;
                      backdrop-filter: blur(8px);
                    }
                    .tp-inline .chip:hover {
                      box-shadow: 0 15px 40px rgba(251, 146, 60, 0.35);
                      transform: scale(1.05);
                    }
                    .tp-inline .chip strong{
                      font-weight:800;
                      background: linear-gradient(135deg, #ea580c, #f97316);
                      -webkit-background-clip: text;
                      -webkit-text-fill-color: transparent;
                      background-clip: text;
                    }
                    .tp-inline .chip .rng{font-size:13px;color:#78350f;font-weight:600}
                  </style>
                  <div class="tp-inline mt-6">
                    <div class="relative h-3 w-full overflow-hidden rounded-full border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-inner" aria-hidden="true">
                      <div class="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-orange-400 to-amber-400"></div>
                    </div>
                    <div class="relative mt-4">
                      ${tiersMid.map(r => `
                        <div class=\"absolute marker\" style=\"left:${pct(r.mid).toFixed(2)}%\">
                          <div class=\"chip inline-flex items-baseline gap-2 rounded-full px-3 py-1\">
                            <strong class=\"text-gray-900\">${esc(r.price)}</strong>
                            <i class=\"rng not-italic\">${esc(
                              r.max === 'inf'
                                ? `${r.min.toLocaleString('en-US')}+`
                                : (Number(r.max) === r.min
                                    ? `${r.min.toLocaleString('en-US')}`
                                    : `${r.min.toLocaleString('en-US')}–${Number(r.max).toLocaleString('en-US')}`)
                            )}</i>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="relative mt-2 w-full h-5 text-[12px] text-gray-500">
                      ${stops.map(s => `<span class=\"absolute\" style=\"left:${pct(Number(s)).toFixed(2)}%;transform:translateX(-50%)\">${Number(s).toLocaleString('en-US')}</span>`).join('')}
                      <span class="absolute" style="left:100%;transform:translateX(-100%)">End</span>
                    </div>
                  </div>
                  `;
                })() : `
                <div class="text-base">
                  <span class="font-semibold">${priceText || listingPriceFallback || 'See supplier for price'}</span>
                  ${moqQtyText ? `<span class=\"text-gray-800 ml-2\">${moqQtyText} (MOQ)</span>` : ''}
                </div>
                `}
              </div>

              

              ${detailsBlock}
  `;

  return (
    <div className="px-6 md:px-10 xl:px-16 py-6">
      <HeroAutoFillClient />
      <div className="flex items-start justify-between gap-4 mb-4">
        <ol className="flex flex-wrap items-center gap-1">
          {(() => {
            const crumbs: { label: string; href?: string }[] = [];
            const plat = String(listing.platform || '');
            // Website crumb: prefer hostname when URL present, else platform label
            let siteLabel: string = platformLabel(plat as any) || plat;
            try {
              if (listing.url) {
                const u = new URL(listing.url);
                siteLabel = (u.hostname || siteLabel).replace(/^www\./i, '');
              }
            } catch {}
            crumbs.push({ label: siteLabel, href: `/products?platform=${encodeURIComponent(plat)}` });

            // Derive up to 3 levels: category > sub-category > sub-sub category
            const catsRaw = Array.isArray(listing.categories) ? listing.categories.filter(Boolean) as string[] : [];
            const MAX_LEVELS = 3;
            const keyToLabel = new Map(CATEGORIES.map(c => [c.key, c.label] as const));
            const normalized = (s: string) => s.trim().toLowerCase();

            // Helper: DFS to find path for a key/label in shared taxonomy
            const findPath = (target: string): string[] => {
              const tkey = toKey(target);
              const stack: { node: SharedCategoryNode; path: string[] }[] = SHARED_CATEGORIES.map(n => ({ node: n, path: [n.label] }));
              while (stack.length) {
                const { node, path } = stack.pop()!;
                if (normalized(node.label) === normalized(target) || node.key === tkey) {
                  return path;
                }
                if (node.children) {
                  for (const ch of node.children) stack.push({ node: ch, path: [...path, ch.label] });
                }
                if ((node as any).leaves) {
                  for (const l of (node as any).leaves as any[]) {
                    if (normalized(l.label) === normalized(target) || l.key === tkey) return [...path, l.label];
                  }
                }
              }
              return [];
            };

            // Start with provided categories (map keys to labels when known)
            let path: string[] = [];
            if (catsRaw.length) {
              // If already hierarchical, use first 3 entries
              path = catsRaw.map(s => keyToLabel.get(s) || s).slice(0, MAX_LEVELS);
            }

            // If shallow (<=1), attempt to derive from shared taxonomy using categories, terms, or title
            if (path.length <= 1) {
              const candidates: string[] = [];
              if (catsRaw.length) candidates.push(...catsRaw);
              if (Array.isArray(listing.terms)) candidates.push(...(listing.terms as string[]));
              if (listing.title) candidates.push(String(listing.title));
              if (listing.description) candidates.push(String(listing.description));
              // Prefer the first candidate that yields a path of length >= 2
              for (const cand of candidates) {
                const p = findPath(cand);
                if (p.length >= 2) { path = p.slice(0, MAX_LEVELS); break; }
              }
            }

            // Emit crumbs for derived path
            return crumbs
              .concat(path.map(label => ({ label, href: `/products?platform=${encodeURIComponent(plat)}&q=${encodeURIComponent(label)}` })))
              .map((c, idx) => (
                <li key={`${c.label}-${idx}`} className="inline-flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right text-gray-400">
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                  )}
                  {c.href ? (
                    <Link className="transition-colors hover:text-foreground hover:underline" href={c.href}>{c.label}</Link>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </li>
              ));
          })()}
        </ol>
        <div className="flex gap-2 shrink-0">
          {listing.url ? (
            <Link href={listing.url} target="_blank" className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500">Open Original ↗</Link>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 overflow-x-auto">
        <TrackProductView 
          savedListingId={id}
          productTitle={listing.title || 'Product'}
          productImage={listing.image}
          productUrl={`/pools/${id}`}
        />
        {/* Pool hero section with timer */}
        <div className="pool-hero grid grid-cols-1 md:grid-cols-[420px_1fr] gap-10 items-start" data-source-url={listing.url || ''}>
          <div className="pool-hero-left">
            <div className="relative w-full aspect-square bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 rounded-3xl overflow-hidden border-4 border-orange-300/60 shadow-2xl ring-4 ring-orange-100/50">
              <img src={imgSrc} alt={titleRaw} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
              <a href={`/checkout?listingId=${id}`} className="inline-flex items-center justify-center rounded-2xl font-bold btn-mag text-2xl px-10 py-5 w-full text-white">
                <span className="mr-2">🛒</span> Join Pool
              </a>
              <a href="/information/payment-protection" className="text-base text-orange-600 font-semibold underline hover:text-orange-700 flex items-center gap-2">
                <span className="text-xl">🔒</span> Payment Protection Guaranteed
              </a>
            </div>
          </div>
          <div className="pool-hero-right min-w-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent leading-tight">{titleRaw}</h1>
              <PoolTimerInjector deadline={timerDeadlineISO} />
            </div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
      {/* TieredPricing component removed per request */}
      
      {/* Social Share Section */}
      <div className="mt-8">
        <SocialShare 
          url={`${process.env.APP_BASE_URL || 'https://moqpools.com'}/pools/${id}`}
          title={titleRaw}
          description={`Join the group buy for ${titleRaw}. Get wholesale prices through collective purchasing!`}
        />
      </div>

      {/* Product Reviews Section */}
      <div className="mt-12">
        <ProductReviews productId={id} canReview={true} />
      </div>
    </div>
  );
}

