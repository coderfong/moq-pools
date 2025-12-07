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
// PERFORMANCE: Lazy load heavy components to speed up initial page load
import NextDynamic from 'next/dynamic';
const ProductReviews = NextDynamic(() => import('../../../src/components/ProductReviews'), {
  ssr: false,
  loading: () => <div className="mt-12 h-48 animate-pulse bg-gray-100 rounded-lg" />
});
const SimilarProducts = NextDynamic(() => import('./SimilarProducts'), { 
  ssr: false,
  loading: () => <div className="mt-12 h-64 animate-pulse bg-gray-100 rounded-lg" />
});

export const dynamic = 'force-dynamic';
export const revalidate = 60; // PERFORMANCE: Cache pool pages for 60 seconds

// PERFORMANCE: Force database-only mode, disable expensive external operations
const FAST = true;

// PERFORMANCE: Timeout wrapper for database queries to prevent hanging
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms))
  ]);
}

// Pool detail page with live progress tracking
export default async function PoolDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { id } = params;
  // If Prisma isn't available (e.g., missing DATABASE_URL), this page cannot load data
  if (!prisma) {
    console.error(`[Pool ${id}] Prisma not available`);
    return notFound();
  }
  const listing = await withTimeout(
    prisma.savedListing.findUnique({ where: { id } }),
    3000 // Increased timeout from 800ms to 3000ms for better reliability
  ).catch((err) => {
    console.error(`[Pool ${id}] Database query failed:`, err?.message || err);
    return null;
  }) as any;
  if (!listing) {
    console.warn(`[Pool ${id}] Listing not found in database`);
    return notFound();
  }
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

  // PERFORMANCE: Disabled automatic refresh for weak details to prevent slow page loads
  // When FAST mode is enabled, we only use cached data and synthetic fallbacks
  // This prevents expensive external scraping operations that block page render for seconds
  // Users can still manually refresh with ?refresh=1 if they need fresh data
  
  // DISABLED: Automatic detail refresh (blocks page load for seconds)
  // if (!force) {
  //   try {
  //     if (isWeak) {
  //       const { refreshProductDetail } = await import('@/lib/providers/detail');
  //       const fresh = await refreshProductDetail(listing).catch(() => null);
  //       if (fresh) {
  //         detail = fresh;
  //         try {
  //           const { normalizeDetail, isWeakDetail } = await import('@/lib/detail-contract');
  //           normalized = normalizeDetail(...);
  //           if (!detail?.priceText && normalized.priceText) detail.priceText = normalized.priceText;
  //           if ((!detail?.priceTiers || detail.priceTiers.length === 0) && normalized.priceTiers?.length) detail.priceTiers = normalized.priceTiers;
  //           if (!detail?.heroImage && normalized?.heroImage) detail.heroImage = normalized.heroImage;
  //           try { isWeak = isWeakDetail(normalized as any); } catch {}
  //         } catch {}
  //       }
  //     }
  //   } catch {}
  // }
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
  // Upgrade Alibaba thumbnail URLs to higher resolution
  function upgradeThumbnail(url: string): string {
    if (!url) return url;
    // Replace thumbnail suffixes with higher resolution versions
    // _80x80 -> _960x960, _50x50 -> _960x960, _220x220 -> _960x960
    return url.replace(/_(\d+)x(\d+)\.(jpg|png|webp)/i, '_960x960.$3');
  }
  
  async function computeHeroImage(): Promise<string> {
    const { resolveFallbackImage, isBadImageHashFromPath } = await import('@/lib/imageFallbacks');
    const raw: string = String(listing.image || '');
    const hero: string = String((detail as any)?.heroImage || '');
    const title: string = String(listing.title || '');
    const desc: string = String(listing.description || '');
    const fallback = resolveFallbackImage(raw, title, desc) || '';
    // PERFORMANCE: Removed preferIM and isAli flags - not needed when FAST mode is enabled
    // const preferIM = String((listing as any)?.platform || '').toUpperCase() === 'INDIAMART';
    // const isAli = String((listing as any)?.platform || '').toUpperCase() === 'ALIBABA';

    // 1) Prefer already-cached listing image if valid
    if (raw && raw.startsWith('/cache/') && !isBadImageHashFromPath(raw)) {
      return raw;
    }

    // 2) If parser resolved a heroImage and it's already cached, use it
    if (hero && hero.startsWith('/cache/') && !isBadImageHashFromPath(hero)) {
      return hero;
    }
    
    // PERFORMANCE: Disabled synchronous image caching operations that block page load
    // These operations can take seconds and significantly slow down page rendering
    // Images should be pre-cached via background jobs, not during page render
    
    // DISABLED: Hero image caching (blocks page load)
    // if (hero && (hero.startsWith('http://') || hero.startsWith('https://') || hero.startsWith('//'))) {
    //   try {
    //     const { cacheExternalImage } = await import('@/lib/imageCache');
    //     const { localPath } = await cacheExternalImage(hero, { preferJpgForIndiaMart: preferIM });
    //     if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
    //   } catch {}
    // }

    // DISABLED: Listing image caching (blocks page load)
    // if (raw && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//'))) {
    //   try {
    //     const { cacheExternalImage } = await import('@/lib/imageCache');
    //     const { localPath } = await cacheExternalImage(raw, { preferJpgForIndiaMart: preferIM });
    //     if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
    //   } catch {}
    // }

    // DISABLED: Alibaba detail image scraping and caching (blocks page load for seconds)
    // if (isAli && listing.url) {
    //   try {
    //     const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
    //     const best = await getAlibabaDetailFirstJpg(String(listing.url));
    //     if (best) {
    //       const { cacheExternalImage } = await import('@/lib/imageCache');
    //       const { localPath } = await cacheExternalImage(best);
    //       if (localPath && !isBadImageHashFromPath(localPath)) return localPath;
    //       if (/^https?:\/\//i.test(best)) return best;
    //     }
    //   } catch {}
    // }
    
    // DISABLED: API fetch to resolve-img (blocks page load with network call)
    // try {
    //   const apiPath = `/api/external/resolve-img?src=${encodeURIComponent(String(listing.url))}`;
    //   let abs = apiPath;
    //   try {
    //     const h = headers();
    //     const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
    //     const proto = h.get('x-forwarded-proto') || (String(hostH).includes('localhost') || String(hostH).includes('127.0.0.1') ? 'http' : 'https');
    //     abs = `${proto}://${hostH}${apiPath}`;
    //   } catch {
    //     const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    //     abs = `${base}${apiPath}`;
    //   }
    //   const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
    //   if (resp?.ok) {
    //     const data = await resp.json().catch(() => null);
    //     const lp = data?.localPath as string | undefined;
    //     if (lp && !isBadImageHashFromPath(lp)) return lp;
    //   }
    // } catch {}

    // 3) Use remote URLs directly if available (browser handles caching)
    // Upgrade thumbnails to higher resolution for better quality
    if (hero && (hero.startsWith('http://') || hero.startsWith('https://'))) {
      return upgradeThumbnail(hero);
    }
    
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
      return upgradeThumbnail(raw);
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
  // Timer deadline: prefer Pool.deadlineAt for the associated product; 
  // fallback to listing.createdAt + 5 days for consistent deadline across page refreshes
  let timerDeadlineISO: string = '';
  try {
    const prod = await withTimeout(
      prisma.product.findFirst({
        where: { sourceUrl: String((listing as any)?.url || '') },
        select: { pool: { select: { deadlineAt: true } } },
      }),
      800 // PERFORMANCE: Reduced from 1500ms to 800ms
    ).catch(() => null) as any;
    if (prod?.pool?.deadlineAt) {
      timerDeadlineISO = new Date(prod.pool.deadlineAt).toISOString();
    }
  } catch {}
  if (!timerDeadlineISO) {
    // Use listing.createdAt + 5 days for consistent deadline
    const createdAt = (listing as any)?.createdAt ? new Date((listing as any).createdAt) : new Date();
    const deadline = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
    timerDeadlineISO = deadline.toISOString();
  }

  // Build details sections
  const keyAttrSec = (Array.isArray(detail?.attributes) && detail.attributes.length) ? `
              <section class="mt-4 sm:mt-8">
                <h2 class="text-sm sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-4">Key attributes</h2>
                <div class="overflow-hidden rounded-lg sm:rounded-2xl border sm:border-2 border-orange-200/50 bg-white shadow-md sm:shadow-lg">
                  <div class="grid grid-cols-2 divide-x divide-orange-100">
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
              <section class="mt-4 sm:mt-8">
                <h2 class="text-sm sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-4">Variations</h2>
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
              <section class="mt-4 sm:mt-8">
                <h2 class="text-sm sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-4">Packaging and delivery</h2>
                <div class=\"overflow-hidden rounded-2xl border-2 border-orange-200/50 bg-white shadow-lg\">
                  <table class=\"sec-table w-full text-sm\"><tbody>
                      ${detail.packaging.map((r: any, i: number) => `<tr key=\"${esc(r.name)}|${esc(r.value)}|${i}\"><th class=\"th-label\">${esc(toTitleCase(r.name))}</th><td>${esc(r.value)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </section>` : '';

  const protectionsSec = (Array.isArray(protections) && protections.length) ? `
              <section class="mt-4 sm:mt-8">
                <h2 class="text-sm sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-4">Protections</h2>
                <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-2 sm:gap-4">
                  ${protections.map((p, i) => `
                    <div key="prot-${i}" class="prot-card bg-gradient-to-br from-white to-orange-50/30 border sm:border-2 border-orange-200 rounded-lg sm:rounded-2xl p-2 sm:p-4 md:p-5 shadow-md sm:shadow-lg"> 
                      <div class="font-bold text-gray-900 text-xs sm:text-sm md:text-base">${p.header ? esc(p.header) : ''}</div>
                      <p class="text-[10px] sm:text-xs md:text-sm text-gray-700 mt-1 sm:mt-2 leading-relaxed">${p.body ? esc(p.body) : ''}</p>
                    </div>
                  `).join('')}
                </div>
              </section>` : '';

  const supplierSec = supplierName ? `
              <section class=\"mt-4 sm:mt-8\">
                <h2 class=\"text-sm sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-4\">Supplier</h2>
                <div class=\"supplier-card rounded-lg sm:rounded-2xl p-2 sm:p-4 md:p-6 shadow-md sm:shadow-xl flex items-center gap-2 sm:gap-3 md:gap-4\">
                  ${companyLogo ? `<img src=\"${companyLogo}\" alt=\"${supplierName}\" class=\"w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full border sm:border-2 border-orange-300 shadow-sm sm:shadow-md\" referrerpolicy=\"no-referrer\" />` : '<div class=\"w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm sm:text-xl md:text-2xl font-bold shadow-sm sm:shadow-md\">🏭</div>'}
                  <div class=\"flex-1 min-w-0\">
                    <div class=\"font-bold text-xs sm:text-base md:text-xl text-gray-900 truncate\">${supplierName}</div>
                    ${companyLink ? `<a href=\"${companyLink}\" target=\"_blank\" class=\"text-[10px] sm:text-xs md:text-sm text-orange-600 hover:text-orange-700 font-medium underline mt-0.5 sm:mt-1 inline-block\">View profile →</a>` : ''}
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
            /* Ensure all text has proper colors */
            * {
              color: inherit;
            }
            
            /* Section tables and cards styling */
            .sec-table th.th-label { 
              text-align:left; 
              color:#111827 !important; 
              font-weight:700; 
              padding:6px 8px; 
              background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
              border-bottom: 1px solid #fb923c;
              font-size: 0.625rem;
            }
            @media (min-width: 640px) {
              .sec-table th.th-label {
                padding:10px 12px;
                border-bottom: 1.5px solid #fb923c;
                font-size: 0.75rem;
              }
            }
            @media (min-width: 768px) {
              .sec-table th.th-label {
                padding:14px 18px;
                border-bottom: 2px solid #fb923c;
                font-size: 0.875rem;
              }
            }
            .sec-table td { 
              padding:6px 8px; 
              color:#4b5563 !important;
              border-bottom: 1px solid #fed7aa;
              font-size: 0.625rem;
            }
            @media (min-width: 640px) {
              .sec-table td {
                padding:10px 12px;
                font-size: 0.75rem;
              }
            }
            @media (min-width: 768px) {
              .sec-table td {
                padding:14px 18px;
                font-size: 0.875rem;
              }
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
              padding: 0.5rem;
              border-radius: 0.75rem;
              margin-bottom: 1rem;
            }
            @media (min-width: 768px) {
              .pool-hero {
                padding: 1.5rem;
                border-radius: 1.5rem;
                margin-bottom: 2rem;
              }
            }
            @media (min-width: 1024px) {
              .pool-hero {
                padding: 2rem;
              }
            }
            .pool-hero-left {
              position: relative;
            }
            @media (min-width: 1024px) {
              .pool-hero-left {
                position: sticky;
                top: 20px;
              }
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
            
            /* Explicit color classes */
            .text-gray-900 { color: #111827 !important; }
            .text-gray-800 { color: #1f2937 !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-gray-500 { color: #6b7280 !important; }
            .text-orange-600 { color: #ea580c !important; }
            .text-orange-700 { color: #c2410c !important; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
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
                  
                  // Adjust marker positions to prevent overlap
                  // Minimum spacing: 22% on mobile to prevent overlap
                  const MIN_SPACING = 22;
                  const adjustedTiers = tiersMid.map((r, i) => ({...r, adjustedPct: pct(r.mid)}));
                  
                  // Sort by position and push overlapping markers apart
                  for (let i = 1; i < adjustedTiers.length; i++) {
                    const prev = adjustedTiers[i - 1];
                    const curr = adjustedTiers[i];
                    const gap = curr.adjustedPct - prev.adjustedPct;
                    
                    if (gap < MIN_SPACING) {
                      // Push current marker to the right to maintain minimum spacing
                      curr.adjustedPct = prev.adjustedPct + MIN_SPACING;
                      
                      // Cap at 95% to keep within bounds
                      if (curr.adjustedPct > 95) {
                        curr.adjustedPct = 95;
                      }
                    }
                  }
                  
                  return `
                  <style>
                    .tp-inline .marker{transform:translateX(-50%); top:8px; pointer-events: auto;}
                    .tp-inline .chip{
                      background: linear-gradient(135deg, rgba(255, 247, 237, 0.98) 0%, rgba(255, 251, 235, 0.98) 100%);
                      border: 0.5px solid #fb923c;
                      box-shadow: 0 2px 8px rgba(251, 146, 60, 0.2);
                      border-radius: 9999px;
                      backdrop-filter: blur(8px);
                      white-space: nowrap;
                      transition: all 0.2s ease;
                      font-size: 0.5rem;
                      padding: 0.0625rem 0.25rem;
                      line-height: 1.2;
                    }
                    @media (min-width: 640px) {
                      .tp-inline .marker{top:15px;}
                      .tp-inline .chip{
                        border: 1.5px solid #fb923c;
                        box-shadow: 0 6px 20px rgba(251, 146, 60, 0.25);
                        font-size: 0.75rem;
                        padding: 0.25rem 0.5rem;
                      }
                    }
                    @media (min-width: 768px) {
                      .tp-inline .marker{top:20px;}
                      .tp-inline .chip{
                        border: 2px solid #fb923c;
                        box-shadow: 0 10px 30px rgba(251, 146, 60, 0.25);
                        font-size: 0.875rem;
                        padding: 0.25rem 0.75rem;
                      }
                    }
                    .tp-inline .chip:hover {
                      box-shadow: 0 15px 40px rgba(251, 146, 60, 0.35);
                      transform: scale(1.1);
                      z-index: 10;
                    }
                    .tp-inline .chip strong{
                      font-weight:800;
                      background: linear-gradient(135deg, #ea580c, #f97316);
                      -webkit-background-clip: text;
                      -webkit-text-fill-color: transparent;
                      background-clip: text;
                    }
                    .tp-inline .chip .rng{font-size:7px;color:#78350f;font-weight:600;line-height:1.2}
                    @media (min-width: 640px) {
                      .tp-inline .chip .rng{font-size:9px}
                    }
                    @media (min-width: 768px) {
                      .tp-inline .chip .rng{font-size:11px}
                    }
                    @media (min-width: 1024px) {
                      .tp-inline .chip .rng{font-size:13px}
                    }
                  </style>
                  <div class="tp-inline mt-6">
                    <div class="relative mt-4">
                      ${adjustedTiers.map(r => `
                        <div class=\"absolute marker\" style=\"left:${r.adjustedPct.toFixed(2)}%\">
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
                      ${(() => {
                        // Apply same spacing logic to numeric ticks
                        const MIN_TICK_SPACING = 12; // Increased spacing for mobile to prevent overlap
                        const ticks = stops.map(s => ({
                          value: Number(s),
                          pct: pct(Number(s))
                        }));
                        
                        // Adjust positions to prevent overlap
                        for (let i = 1; i < ticks.length; i++) {
                          const prev = ticks[i - 1];
                          const curr = ticks[i];
                          const gap = curr.pct - prev.pct;
                          
                          if (gap < MIN_TICK_SPACING) {
                            curr.pct = prev.pct + MIN_TICK_SPACING;
                            if (curr.pct > 92) curr.pct = 92; // Leave room for "End"
                          }
                        }
                        
                        return ticks.map(t => 
                          `<span class=\"absolute\" style=\"left:${t.pct.toFixed(2)}%;transform:translateX(-50%)\">${t.value.toLocaleString('en-US')}</span>`
                        ).join('');
                      })()}
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
    <div className="px-2 sm:px-4 md:px-6 lg:px-10 xl:px-16 py-2 sm:py-4 md:py-6 min-h-screen bg-gray-50">
      <HeroAutoFillClient />
      <div className="flex flex-col sm:flex-row items-start justify-between gap-1 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
        <ol className="flex flex-wrap items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm md:text-base overflow-hidden">
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

            // PERFORMANCE: Simplified breadcrumb generation - use simple category list without expensive tree traversal
            const catsRaw = Array.isArray(listing.categories) ? listing.categories.filter(Boolean) as string[] : [];
            const MAX_LEVELS = 2; // Reduced from 3 to 2 for faster rendering
            const keyToLabel = new Map(CATEGORIES.map(c => [c.key, c.label] as const));

            // Start with provided categories (map keys to labels when known) - limit to 2 levels
            let path: string[] = [];
            if (catsRaw.length) {
              path = catsRaw.map(s => keyToLabel.get(s) || s).slice(0, MAX_LEVELS);
            }

            // PERFORMANCE: Removed expensive DFS tree traversal through shared taxonomy
            // This was iterating through entire category tree for every page load
            // If categories are missing, that's acceptable - breadcrumbs will just be simpler

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
        <div className="flex gap-1 sm:gap-2 shrink-0 w-full sm:w-auto">
          {listing.url ? (
            <Link href={listing.url} target="_blank" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded sm:rounded-md bg-indigo-600 text-white hover:bg-indigo-500 whitespace-nowrap">Open Original ↗</Link>
          ) : null}
        </div>
      </div>
      <div className="rounded sm:rounded-lg md:rounded-2xl border border-gray-200 bg-white p-1 sm:p-3 md:p-4 overflow-x-auto">
        <TrackProductView 
          savedListingId={id}
          productTitle={listing.title || 'Product'}
          productImage={listing.image}
          productUrl={`/pools/${id}`}
        />
        {/* Pool hero section with timer */}
        <div className="pool-hero grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-2 sm:gap-4 md:gap-6 lg:gap-10 items-start" data-source-url={listing.url || ''}>
          <div className="pool-hero-left">
            <div className="relative w-3/5 sm:w-full mx-auto aspect-square bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 rounded-lg sm:rounded-2xl md:rounded-3xl overflow-hidden border sm:border-2 md:border-4 border-orange-300/60 shadow-md sm:shadow-xl md:shadow-2xl ring-1 sm:ring-2 md:ring-4 ring-orange-100/50">
              <img src={imgSrc} alt={titleRaw} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="mt-2 sm:mt-4 md:mt-6 flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
              <a href={`/checkout?listingId=${id}`} className="inline-flex items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl font-bold btn-mag text-sm sm:text-lg md:text-2xl px-4 sm:px-6 md:px-10 py-2 sm:py-3 md:py-5 w-full text-white">
                <span className="mr-2">🛒</span> Join Pool
              </a>
              <a href="/information/payment-protection" className="text-xs sm:text-sm md:text-base text-orange-600 font-semibold underline hover:text-orange-700 flex items-center gap-1 sm:gap-2">
                <span className="text-xl">🔒</span> Payment Protection Guaranteed
              </a>
            </div>
          </div>
          <div className="pool-hero-right min-w-0">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
              <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent leading-tight">{titleRaw}</h1>
              <PoolTimerInjector deadline={timerDeadlineISO} />
            </div>
            <LivePoolProgress savedListingId={id} />
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
      <div className="mt-6 sm:mt-8 md:mt-12">
        <ProductReviews productId={id} canReview={true} />
      </div>

      {/* Similar Products Section */}
      <div className="mt-6 sm:mt-8 md:mt-12">
        <SimilarProducts currentProductId={id} categories={listing.categories || []} />
      </div>
    </div>
  );
}

