import NextDynamic from 'next/dynamic';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
// Client components - allow SSR but will hydrate on client
import SourceTabs from '@/components/SourceTabs';
import SearchBar from '@/components/SearchBar';
import { buildExternalSearchUrl, platformLabel } from '@/lib/sourceLinks';
import CategoryDropdown from '@/components/CategoryDropdown';
import FiltersBar from '@/components/FiltersBar';
import SortDropdown from '@/components/SortDropdown';
// Removed client infinite scrolling in favor of page-based pagination
import type { ExternalListing } from '@/lib/providers/types';
import { querySavedListings } from '@/lib/listingStore';
// heavy provider/image helpers are dynamically imported at use-sites to speed dev compiles
import { normalizeIndiaMartLink } from '@/lib/indiamart/url';
import { ensureAliveIndiaMartUrl } from '@/lib/indiamart/rehydrate';
// Progress bar removed from SSR listing cards
import { resolveFallbackImage } from '@/lib/imageFallbacks';
import { isBadImageHashFromPath } from '@/lib/badImages';
import DetailPanelHost from '@/components/DetailPanelHost';
import IndiaMartWarmFetchClient from '@/components/IndiaMartWarmFetchClient';
import DetailLink from '@/components/DetailLink';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import PlatformBadge from '@/components/PlatformBadge';
import EmptyState from '@/components/EmptyState';
import { RevealSection, RevealItem } from '@/components/Reveal';
import GridDensityPreference from '@/components/GridDensityPreference';
import { formatNumberEN } from '@/lib/format';
const SyncedCountdown = NextDynamic(() => import('@/components/SyncedCountdown'), { ssr: false });
import ProductCardButtons from '@/components/ProductCardButtons';
import AdminActions from '@/components/AdminActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const price = (x: any) => (x?.toString?.() ?? String(x));

export default async function Products({ searchParams }: { searchParams: { platform?: string, lplatform?: string, q?: string, lk?: string, minPrice?: string, maxPrice?: string, minMoq?: string, maxMoq?: string, moqLeft?: string, page?: string, per?: string, cols?: string, sort?: string } }) {
  // PERFORMANCE FIX: Force FAST mode to disable ALL image scraping on page load
  // Images should come from database only - no external fetching
  const FAST = true; // Always true - database-first architecture
  // const FAST = !/^(0|false|no)$/i.test(String((searchParams as any).fast || process.env.NEXT_PUBLIC_FAST_LISTINGS || '1'));
  // Accept legacy/alias param lplatform to support existing links
  const platformParam = searchParams.platform || searchParams.lplatform || 'ALL';
  const platform = platformParam.toUpperCase() as any;
  const isAllTab = platform === 'ALL';
  // Temporarily hide IndiaMART providers in ALL view; include Alibaba, 1688, MIC, and Global Sources
  const ALL_ALLOWED_PLATFORMS = ['ALIBABA','C1688','MADE_IN_CHINA','GLOBAL_SOURCES'] as const;
  // Support both q and lk (category leaf) as inputs; prefer q, fallback to lk
  const rawQ = (searchParams.q || '').trim();
  const lk = (searchParams.lk || '').trim();
  let q = rawQ || lk || '';
  if (platform === 'INDIAMART' && lk) {
    try {
      const { getIndiaMartSearchTerms } = await import('@/lib/indiamartCategories');
      const terms = getIndiaMartSearchTerms(lk);
      // If no explicit query, seed with first term; if query present but extremely short, also replace.
      if ((!rawQ || rawQ.length < 2) && terms.length) {
        q = terms[0];
      }
    } catch {}
  }
  // Provide a default seed term for IndiaMART when user lands without a query so page isn't empty.
  const defaultIndiaMartTerm = 'apparel';
  const effectiveQ = (platform === 'INDIAMART' && !q) ? defaultIndiaMartTerm : q;
  // Default to headless=true to improve provider results (disable with headless=0)
  const headless = /^(0|false|no)$/i.test(String((searchParams as any).headless || '1')) ? false : true;
  const nocache = /^(1|true|yes)$/i.test(String((searchParams as any).nocache || ''));
  const minPriceQ = Number(searchParams.minPrice || '');
  const maxPriceQ = Number(searchParams.maxPrice || '');
  const minMoqQ = Number(searchParams.minMoq || '');
  const maxMoqQ = Number(searchParams.maxMoq || '');
  // Page-based pagination (default 50 per category/search page)
  // Allow larger pages
  const perPage = Math.min(500, Math.max(10, Number(searchParams.per || '50')));
  const page = Math.max(1, Number(searchParams.page || '1'));
  // Fixed 5 columns per row (desktop)
  const gridColsClass = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5';
  // Fetch aggressively to ensure we have enough unique, deduped items to fill the page
  // Overfetch by a factor to compensate for duplicates and sparse pages from providers
  // Fetch more aggressively to ensure enough after filtering/dedupe
  // Fetch far more to compensate for dedupe and filtering, then slice with stable sort
  const extLimit = Math.min(6000, Math.max(600, perPage * page * 10));
  // moqLeft reserved for pools (hidden section)

  // Live external listings: when 'ALL', fetch across all platforms
  const searchTerm = effectiveQ; // use default when needed for IndiaMART

  const where: any = {
    isActive: true,
    moqQty: { gt: 0 },
    // Only show products that have a sourceUrl (came from a marketplace listing)
    NOT: [{ sourceUrl: null }],
  };
  
  // Filter by platform: when not ALL, filter by specific platform
  if (platform !== 'ALL') {
    where.sourcePlatform = platform;
  }
  // When ALL is selected, show all platforms (no filter)
  // This ensures pool products from any source platform are visible
  
  // Apply search query filter
  if (q) {
    where.OR = [
      { title:       { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { supplier:    { name: { contains: q, mode: 'insensitive' } } as any }
    ];
  }

  // Minimal local types to keep TS happy without pulling Prisma types here
  type Item = any;
  type CountRow = any;

  function withTimeout<T>(p: Promise<T>, ms = 5000, label = 'op'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error(`timeout:${label}`)), Math.max(800, ms));
      p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
    });
  }
  const hasDb = !!process.env.DATABASE_URL;
  const [items, counts, extItems] = await Promise.all([
    (hasDb && prisma ? withTimeout(prisma.product.findMany({
      where,
      include: { pool: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }), 6000, 'db:findMany').catch(() => []) : Promise.resolve([])) as Promise<any[]>,
  (hasDb && prisma ? withTimeout(prisma.product.groupBy({ 
      by: ['sourcePlatform'], 
      where: { 
        isActive: true, 
        moqQty: { gt: 0 }, 
        sourcePlatform: { in: ALL_ALLOWED_PLATFORMS as any } 
      }, 
      _count: { _all: true } 
    }), 5000, 'db:groupBy').catch(() => []) : Promise.resolve([])) as Promise<any[]>,
    (async (): Promise<ExternalListing[]> => {
      try {
        console.log('[PRODUCTS DEBUG] Fetching from SavedListing only, platform:', platform, 'searchTerm:', searchTerm);
        
        // PRIORITY: Fetch SavedListings that have pools FIRST
        let savedWithPools: ExternalListing[] = [];
        if (hasDb && prisma) {
          try {
            // Get all products with pools and their sourceUrls
            const productsWithPools = await prisma.product.findMany({
              where: {
                pool: { isNot: null },
                sourceUrl: { not: null }
              },
              select: { sourceUrl: true }
            });
            
            const poolUrls = productsWithPools.map(p => p.sourceUrl).filter(Boolean) as string[];
            
            if (poolUrls.length > 0) {
              // Fetch SavedListings with these URLs
              const poolListings = await prisma.savedListing.findMany({
                where: {
                  url: { in: poolUrls }
                },
                select: {
                  id: true,
                  platform: true,
                  title: true,
                  image: true,
                  url: true,
                  priceRaw: true,
                  currency: true,
                  moqRaw: true,
                  storeName: true,
                  description: true,
                  ratingRaw: true,
                  ordersRaw: true,
                  detailJson: true,
                }
              });
              
              // Convert to ExternalListing format
              savedWithPools = poolListings.map((row: any) => ({
                id: row.id,
                platform: row.platform || '',
                title: row.title || '',
                image: row.image || '',
                url: row.url || '',
                price: row.priceRaw || '',
                moq: row.moqRaw || '',
                storeName: row.storeName || '',
                description: row.description || '',
                rating: row.ratingRaw || '',
                orders: row.ordersRaw || '',
                detailJson: row.detailJson as any,
              }));
              
              console.log('[PRODUCTS DEBUG] SavedListings with pools fetched:', savedWithPools.length);
            }
          } catch (err) {
            console.error('[PRODUCTS DEBUG] Error fetching pool listings:', err);
          }
        }
        
        // Then fetch regular SavedListings
        // PERFORMANCE: Reduced from 10,000 to 1,000 to speed up initial load
        const savedLimit = searchTerm ? Math.min(500, perPage * 10) : Math.min(1000, perPage * 20);
        console.log('[PRODUCTS DEBUG] Calling querySavedListings with limit:', savedLimit);
        const saved = await querySavedListings({
          q: searchTerm,
          platform,
          categories: [],
          offset: 0,
          limit: savedLimit,
        });
        console.log('[PRODUCTS DEBUG] Regular SavedListings fetched:', saved.length);
        
        // Combine: pool listings first, then regular listings (dedupe by URL)
        const seenUrls = new Set(savedWithPools.map(l => l.url));
        const regularListings = saved.filter(l => !seenUrls.has(l.url || ''));
        const combined = [...savedWithPools, ...regularListings];
        
        console.log('[PRODUCTS DEBUG] Total combined listings:', combined.length);
        console.log('[PRODUCTS DEBUG] Pool listings in combined:', 
          combined.filter(l => 
            l.url?.includes('Polar-Camera') || 
            l.url?.includes('Batter-Dispenser')
          ).map(l => l.title?.substring(0, 40))
        );
        return combined;
      } catch (err) {
        console.error('[PRODUCTS DEBUG] Error in external listings fetch:', err);
      }
      return [];
    })(),
  ]) as unknown as [Item[], CountRow[], ExternalListing[]];

  // DISABLED FOR PERFORMANCE - Server-side image upgrade was triggering live scraping
  // This was calling getIndiaMartDetailMainImage which scrapes external sites on every page load
  // Images should be pre-cached during initial product ingestion, not on-demand
  // if (!FAST && isAllTab && Array.isArray(extItems) && extItems.length) {
  //   const toFix = extItems.filter((it) => {
  //     try {
  //       const plat = String(it.platform || '').toUpperCase();
  //       const img = String(it.image || '');
  //       const missing = !img || img.startsWith('/seed/');
  //       const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
  //       return plat === 'INDIAMART' && (missing || bad);
  //     } catch { return false; }
  //   }).slice(0, 80);
  //   if (toFix.length) {
  //     const concurrency = 4;
  //     let idx = 0;
  //     async function worker() {
  //       while (idx < toFix.length) {
  //         const i = idx++;
  //         const it = toFix[i];
  //         try {
  //           const { getIndiaMartDetailMainImage } = await import('@/lib/providers/indiamart');
  //           const best = await getIndiaMartDetailMainImage(String(it.url || ''));
  //           if (best) {
  //             const { cacheExternalImage } = await import('@/lib/imageCache');
  //             const cached = await cacheExternalImage(best, { preferJpgForIndiaMart: true });
  //             if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
  //               it.image = cached.localPath;
  //             }
  //           }
  //         } catch {}
  //       }
  //     }
  //     await Promise.all(Array.from({ length: Math.min(concurrency, toFix.length) }, () => worker()));
  //   }
  // }

  // DISABLED FOR PERFORMANCE - Server-side image upgrade was triggering live scraping
  // This was calling getAlibabaDetailFirstJpg and /api/external/resolve-img which scrape external sites
  // Images should be pre-cached during initial product ingestion, not on-demand during page loads
  // if (!FAST && isAllTab && Array.isArray(extItems) && extItems.length) {
  //   const toFixAli = extItems.filter((it) => {
  //     try {
  //       const plat = String(it.platform || '').toUpperCase();
  //       const img = String(it.image || '');
  //       const missing = !img || img.startsWith('/seed/');
  //       const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
  //       return plat === 'ALIBABA' && (missing || bad);
  //     } catch { return false; }
  //   }).slice(0, 80);
  //   if (toFixAli.length) {
  //     const concurrency = 4;
  //     let idx = 0;
  //     async function worker() {
  //       while (idx < toFixAli.length) {
  //         const i = idx++;
  //         const it = toFixAli[i];
  //         try {
  //           const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
  //           const best = await getAlibabaDetailFirstJpg(String(it.url || ''));
  //           if (best) {
  //             const { cacheExternalImage } = await import('@/lib/imageCache');
  //             const cached = await cacheExternalImage(best);
  //             if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
  //               it.image = cached.localPath;
  //             }
  //           } else {
  //             // Fallback: try generic resolver which also caches to /cache
  //             try {
  //               const api = `/api/external/resolve-img?src=${encodeURIComponent(String(it.url || ''))}`;
  //               let abs = api;
  //               try {
  //                 const h = headers();
  //                 const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
  //                 const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
  //                 abs = `${proto}://${hostH}${api}`;
  //               } catch {
  //                 const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  //                 abs = `${base}${api}`;
  //               }
  //               const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
  //               if (resp?.ok) {
  //                 const data = await resp.json().catch(() => null);
  //                 const lp = data?.localPath as string | undefined;
  //                 if (lp && !isBadImageHashFromPath(lp)) it.image = lp;
  //               }
  //             } catch {}
  //           }
  //         } catch {}
  //       }
  //     }
  //     await Promise.all(Array.from({ length: Math.min(concurrency, toFixAli.length) }, () => worker()));
  //   }
  // }

  // NOTE: Made-in-China detail fetching removed - data should be pre-populated via `pnpm mic:prime`
  // To populate Made-in-China listings with proper titles/prices/images, run:
  // 1. pnpm mic:build - generates search jobs
  // 2. pnpm mic:ingest - fetches and saves to SavedListing table
  // 3. pnpm catalog:cache-images - downloads images locally
  // Or simply: pnpm mic:prime (runs all three)

  // DISABLED FOR PERFORMANCE - Platform-specific image upgrades were scraping on every tab visit
  // if (!FAST && platform === 'ALIBABA' && Array.isArray(extItems) && extItems.length) {
  //   const toFixAli2 = extItems.filter((it) => {
  //     try {
  //       const plat = String(it.platform || '').toUpperCase();
  //       if (plat !== 'ALIBABA') return false;
  //       const img = String(it.image || '');
  //       const missing = !img || img.startsWith('/seed/');
  //       const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
  //       return missing || bad;
  //     } catch { return false; }
  //   }).slice(0, 80);
  //   if (toFixAli2.length) {
  //     const concurrency = 4;
  //     let idx = 0;
  //     async function worker() {
  //       while (idx < toFixAli2.length) {
  //         const i = idx++;
  //         const it = toFixAli2[i];
  //         try {
  //           const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
  //           const best = await getAlibabaDetailFirstJpg(String(it.url || ''));
  //           if (best) {
  //             const { cacheExternalImage } = await import('@/lib/imageCache');
  //             const cached = await cacheExternalImage(best);
  //             if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
  //               it.image = cached.localPath;
  //             }
  //           } else {
  //             // Fallback: try generic resolver which also caches to /cache
  //             try {
  //               const api = `/api/external/resolve-img?src=${encodeURIComponent(String(it.url || ''))}`;
  //               let abs = api;
  //               try {
  //                 const h = headers();
  //                 const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
  //                 const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
  //                 abs = `${proto}://${hostH}${api}`;
  //               } catch {
  //                 const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  //                 abs = `${base}${api}`;
  //               }
  //               const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
  //               if (resp?.ok) {
  //                 const data = await resp.json().catch(() => null);
  //                 const lp = data?.localPath as string | undefined;
  //                 if (lp && !isBadImageHashFromPath(lp)) it.image = lp;
  //               }
  //             } catch {}
  //           }
  //         } catch {}
  //       }
  //     }
  //     await Promise.all(Array.from({ length: Math.min(concurrency, toFixAli2.length) }, () => worker()));
  //   }
  // }

  // DISABLED FOR PERFORMANCE - Platform-specific image upgrades were scraping on every tab visit
  // if (!FAST && platform === 'INDIAMART' && Array.isArray(extItems) && extItems.length) {
  //   const toFix2 = extItems.filter((it) => {
  //     try {
  //       const plat = String(it.platform || '').toUpperCase();
  //       if (plat !== 'INDIAMART') return false;
  //       const img = String(it.image || '');
  //       const missing = !img || img.startsWith('/seed/');
  //       const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
  //       return missing || bad;
  //     } catch { return false; }
  //   }).slice(0, 80);
  //   if (toFix2.length) {
  //     const concurrency = 4;
  //     let idx = 0;
  //     async function worker() {
  //       while (idx < toFix2.length) {
  //         const i = idx++;
  //         const it = toFix2[i];
  //         try {
  //           const { getIndiaMartDetailMainImage } = await import('@/lib/providers/indiamart');
  //           const best = await getIndiaMartDetailMainImage(String(it.url || ''));
  //           if (best) {
  //             const { cacheExternalImage } = await import('@/lib/imageCache');
  //             const cached = await cacheExternalImage(best, { preferJpgForIndiaMart: true });
  //             if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
  //               it.image = cached.localPath;
  //             }
  //           }
  //         } catch {}
  //       }
  //     }
  //     await Promise.all(Array.from({ length: Math.min(concurrency, toFix2.length) }, () => worker()));
  //   }
  // }

  // Dev visibility: warn when IndiaMART selected but nothing returned after live fetch attempt
  if (process.env.NODE_ENV !== 'production' && platform === 'INDIAMART' && effectiveQ && !extItems.length) {
    console.warn('[INDIAMART] No external listings returned for query:', effectiveQ);
  }

  const STRICT_OFFLINE = String(process.env.FEATURE_STRICT_OFFLINE || '0');

  // Helpers to parse price/moq from external listing strings
  function parseMinPrice(s?: string): number | null {
    if (!s) return null;
    const m = s.match(/(US\$|\$|USD|RMB|CNY|¥|￥)?\s?(\d{1,6}(?:[\.,]\d{1,2})?)/);
    if (!m) return null;
    const num = Number(m[2].replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }
  // Extract quantity tiers even when prices are on following lines.
  function extractQtyTiers(listing: ExternalListing): { min: number; max?: number; unit?: string; price?: string; priceMax?: string; raw: string }[] {
    const text = [listing.price, listing.description, listing.title].filter(Boolean).join('\n');
    const lines = text
      .split(/\n|\r|\t/g)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const out: { min: number; max?: number; unit?: string; price?: string; priceMax?: string; raw: string }[] = [];
    const qtyRangeRe = /^(\d{1,6})\s*[-~–]\s*(\d{1,6})\s*(pcs|pieces|pairs|sets|units|bags|lots)?\b/i;
    const qtyGteRe = /^(?:≥|>=)\s*(\d{1,6})\s*(pcs|pieces|pairs|sets|units|bags|lots)?\b/i;
    const priceReGlobal = /(US\$|\$|USD|RMB|CNY|¥|￥)\s*(\d{1,6}(?:[\.,]\d{1,2})?)/g;
    const unitFromAll = text.match(/\b(pcs|pieces|pairs|sets|units|bags|lots)\b/i)?.[1]?.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let mRange = line.match(qtyRangeRe);
      let mGte = !mRange ? line.match(qtyGteRe) : null;
      if (mRange || mGte) {
        const min = mRange ? Number(mRange[1]) : Number(mGte![1]);
        const max = mRange ? Number(mRange[2]) : undefined;
        const unit = (mRange?.[3] || mGte?.[2] || unitFromAll || '').toLowerCase() || undefined;
        let priceA: string | undefined;
        let priceB: string | undefined;
        // Try same line first
        const sameLinePrices: string[] = [];
        let pm: RegExpExecArray | null;
        while ((pm = priceReGlobal.exec(line)) != null) {
          sameLinePrices.push(pm[2].replace(/,/g, ''));
        }
        if (sameLinePrices.length >= 1) priceA = sameLinePrices[0];
        if (sameLinePrices.length >= 2) priceB = sameLinePrices[1];
        // If not enough, look ahead up to 2 lines for prices
        if (!priceA || !priceB) {
          let look = 1, collected: string[] = [];
          while (look <= 2 && (i + look) < lines.length) {
            const ln = lines[i + look];
            // stop if next qty line begins
            if (qtyRangeRe.test(ln) || qtyGteRe.test(ln)) break;
            priceReGlobal.lastIndex = 0;
            while ((pm = priceReGlobal.exec(ln)) != null) {
              collected.push(pm[2].replace(/,/g, ''));
            }
            look++;
          }
          if (!priceA && collected[0]) priceA = collected[0];
          if (!priceB && collected[1]) priceB = collected[1];
        }

        out.push({ min, max, unit, price: priceA, priceMax: priceB, raw: line });
      }
    }
    // De-duplicate by signature
    const seen = new Set<string>();
    return out.filter(t => {
      const key = `${t.min}-${t.max ?? 'inf'}-${t.price ?? ''}-${t.priceMax ?? ''}-${t.unit ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.min - b.min);
  }
  function extractMinMaxQty(listing: ExternalListing): { min?: number; max?: number; unit?: string } {
    const tiers = extractQtyTiers(listing);
    if (tiers.length) {
      const min = tiers[0]?.min;
      // Prefer an explicit >= tier for max; else highest upper bound; else highest min
      const gte = tiers.filter(t => t.max == null).slice(-1)[0];
      const max = gte?.min ?? Math.max(...tiers.map(t => t.max ?? t.min));
      return { min, max, unit: tiers[0]?.unit };
    }
    const m0 = parseMoq(listing.moq);
    if (m0 != null) return { min: m0 ?? undefined, max: undefined };
    const combined = `${listing.price || ''} ${listing.title || ''} ${listing.description || ''}`;
    const m1 = parseMoq(combined);
    return { min: m1 ?? undefined, max: undefined };
  }
  function displayOrdersAsSold(orders?: string): string | null {
    if (!orders) return null;
    // Require at least one digit; don't allow a lone period/comma
    if (!/\d/.test(orders)) return null;
    const m = orders.match(/(\d[\d,]*)/);
    if (!m) return null;
    const num = m[1].replace(/(^[.,\s]+|[.,\s]+$)/g, '');
    return `${num} sold`;
  }
  function extractLocation(listing: ExternalListing): string | null {
    const text = [listing.description, listing.title].filter(Boolean).join(' \n ');
    const m = text.match(/\b(CN|US|UK|DE|FR|ES|IT|NL|PL|TR|IN|VN|TH|MY|JP|KR|HK|TW|SG|AU|CA|BR|MX|ID|PH|AE|SA|EG|NG|KE|ZA)\b/);
    return m ? m[1] : null;
  }
  // Identify obviously non-product placeholder/badge images (especially small PNG icons from alicdn)
  function isClearlyNonProductImage(u?: string | null): boolean {
    if (!u) return false;
    try {
      const x = String(u).toLowerCase();
      if (/(@img|sprite|badge|favicon|logo)/.test(x)) return true;
  if (/alicdn\.com/.test(x)) {
        const m = x.match(/_(\d{2,4})x(\d{2,4})(?=[\._])/);
        if (m) {
          const w = Number(m[1]);
          const h = Number(m[2]);
          if (Math.min(w, h) <= 180) return true; // raise cutoff to filter more tiny icons
        }
        // common alicdn badge hash pattern (applies to png and jpeg)
        if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(x)) return true;
      }
    } catch {}
    return false;
  }
  function computeDisplayTitle(listing: ExternalListing): string {
    const removeNoise = (s: string) => s.replace(/\b(certified|verified|supplier)\b/ig, '').replace(/\s+/g, ' ').trim();
    const stripExtAndTrailingIds = (s: string) => {
      let t = String(s || '');
      // Remove common file extensions at end
      t = t.replace(/\.(html?|php|asp|aspx|shtml)\b/ig, '');
      // Remove trailing long numeric IDs and common id/sku tokens
      t = t.replace(/([\s_-]|^)(?:id|sku)[\s:_-]*\d{5,}\b$/i, '');
      t = t.replace(/[\s_-]*\b\d{8,}\b$/g, '');
      // Normalize unit tokens
      t = t.replace(/\bInches?\b/ig, 'inch');
      // Collapse leftover spaces and punctuation padding
      t = t.replace(/\s+/g, ' ').replace(/\s+([\-–])/g, '$1').replace(/([\-–])\s+/g, '$1').trim();
      return t;
    };
    const looksJunky = (s: string) => {
      const t = s.trim();
      if (!t) return true;
      if (/^\d+[\s\/\-]*\d*$/.test(t) && !/[a-z]/i.test(t)) return true; // avoid strings like "1/ 6"
      if (t.length < 4 && !/[a-z]/i.test(t)) return true;
      return false;
    };
    const t1 = stripExtAndTrailingIds(removeNoise(String(listing.title || '')));
    if (t1 && !/^see listing$/i.test(t1) && !looksJunky(t1)) return t1;
    // Try description first line that doesn't look like a price-only line
    const desc = removeNoise(String(listing.description || ''));
    if (desc && !/^(US\$|\$|USD|RMB|CNY|¥|￥)/i.test(desc)) {
      const first = stripExtAndTrailingIds(desc.split(/[\n\r\.\!\?]/)[0].trim());
      if (first && !/^see listing$/i.test(first) && !looksJunky(first)) return first;
    }
    // Derive from URL path segment
    try {
      const u = new URL(String(listing.url || ''));
      const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).slice(-1)[0] || '');
      const guess = stripExtAndTrailingIds(removeNoise(seg.replace(/[-_]+/g, ' ')));
      if (guess && !looksJunky(guess)) return guess;
    } catch {}
    // Last resort: store name product
    if (listing.storeName) return removeNoise(`${listing.storeName} product`);
    return 'Product';
  }

  // Clean any arbitrary title string (e.g., from SavedListing or Detail fetch)
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
  function parseMoq(s?: string): number | null {
    if (!s) return null;
    const str = String(s).trim();
    // Primary: English tokens and ≥
    let m = str.match(/(MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*([\d,]+)/i);
    if (m) {
      const num = Number((m[2] || '').replace(/,/g, ''));
      return Number.isFinite(num) ? num : null;
    }
    // Chinese tokens commonly seen on 1688
    m = str.match(/(起订|最小起订量|最低起订量)\s*[:：]?\s*([\d,]+)/);
    if (m) {
      const num = Number((m[2] || '').replace(/,/g, ''));
      return Number.isFinite(num) ? num : null;
    }
    // Fallback: bare integer possibly followed by unit, but avoid prices (currency symbols)
    if (!/[\$¥￥]|USD|RMB|CNY/.test(str)) {
      m = str.match(/(^|\b)([\d,]{1,6})(?=\s*(pcs?|pieces?|piece|pairs?|sets?|units?|bags?|lots?)\b|$)/i);
      if (m) {
        const num = Number((m[2] || '').replace(/,/g, ''));
        return Number.isFinite(num) ? num : null;
      }
    }
    return null;
  }

  // Deduplicate external items by normalized URL
  function normalizeUrl(u: string) {
    try {
      const url = new URL(u);
      // For export.indiamart product links, the id param distinguishes products; keep only id
      if (/(^|\.)indiamart\.com$/i.test(url.hostname) && url.pathname.includes('/products')) {
        const id = url.searchParams.get('id');
        if (id) {
          url.search = `?id=${id}`;
        } else {
          url.search = '';
        }
      } else {
        url.search = '';
      }
      url.hash = '';
      return url.toString();
    } catch {
      return u;
    }
  }

  // Build a stable, unique key for React rendering, avoiding collisions when URLs normalize to the same string
  function keyFromListing(it: any, i: number) {
    const href = String(it?.url || it?.href || '');
    let id: string | undefined = (it as any)?.id;
    try {
      const u = new URL(href, 'https://example.com');
      const host = u.hostname.replace(/^www\./, '');
      // Prefer IndiaMART export product id
      if (!id && u.hostname === 'export.indiamart.com' && u.pathname === '/products/') {
        id = u.searchParams.get('id') || undefined;
      }
      const base = (it?.platform || 'EXT').toString();
      const slug = id || (it?.title ? String(it.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) : '');
      return [base, host, slug, i].filter(Boolean).join(':');
    } catch {
      return `${it?.platform || 'EXT'}:${id || it?.title || 'item'}:${i}`;
    }
  }
  const uniqExt = (() => {
    const seen = new Set<string>();
    const out: ExternalListing[] = [];
    const src = (extItems || []).filter((it) => {
      if (!isAllTab) return true;
      const plat = String((it as any).platform || '').toUpperCase();
      if (plat) return (ALL_ALLOWED_PLATFORMS as readonly string[]).includes(plat);
      try {
        const u = new URL(String((it as any).url || ''));
        const h = u.hostname.toLowerCase();
        // hide indiamart domains in ALL
        return h.includes('alibaba.com') || h.includes('made-in-china.com');
      } catch { return false; }
    });
    for (const it of src) {
      const key = normalizeUrl(it.url || '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      out.push(it);
    }
    return out;
  })();

  // Normalize obviously dead IndiaMART links early
  if ((platform === 'INDIAMART' || platform === 'INDIAMART_EXPORT') && Array.isArray(uniqExt) && uniqExt.length) {
    for (const it of uniqExt) {
      try { it.url = normalizeIndiaMartLink(String(it.url || ''), searchTerm || ''); } catch {}
    }
  }

  // Apply filters and cleanup for external items
  const applyFilter = (list: ExternalListing[]) => (list || []).filter(raw => {
    // compute prices and MOQ (only used when user applies filters)
    const p = parseMinPrice(raw.price);
    const m0 = parseMoq(raw.moq);
    const m = m0 ?? parseMoq(`${raw.price || ''} ${raw.title || ''} ${raw['description'] || ''}`);
    // Only enforce MOQ when user explicitly sets minMoq/maxMoq
    if (Number.isFinite(minMoqQ) && minMoqQ > 0 && (m == null || m < minMoqQ)) return false;
    if (Number.isFinite(maxMoqQ) && maxMoqQ > 0 && (m != null && m > maxMoqQ)) return false;
    if (Number.isFinite(minPriceQ) && minPriceQ > 0 && (p == null || p < minPriceQ)) return false;
    if (Number.isFinite(maxPriceQ) && maxPriceQ > 0 && (p != null && p > maxPriceQ)) return false;
    return true;
  });

  // Offline-first: do NOT fetch external providers at request time. Only use DB-sourced items.
  let extPool: ExternalListing[] = uniqExt.slice();
  let filteredExt: ExternalListing[] = applyFilter(extPool);
  console.log('[PRODUCTS DEBUG] After filtering:', {
    uniqExtLength: uniqExt.length,
    extPoolLength: extPool.length,
    filteredExtLength: filteredExt.length,
    extItemsLength: (extItems || []).length
  });
  const targetCount = Math.min(perPage * page, perPage * Math.max(1, page));

  // Apply sorting based on sort parameter
  // Default to moq-desc (highest MOQ first) instead of relevance
  const sortParam = searchParams.sort || 'moq-desc';
  
  // Fetch pool data for ALL external listings BEFORE sorting
  const externalListingPoolMap = new Map<string, { pledgedQty: number; targetQty: number; poolId: string; progress: number }>();
  try {
    const urls = filteredExt.map((it) => String(it?.url || '')).filter(Boolean);
    if (urls.length && prisma) {
      const productsWithPools = await prisma.product.findMany({
        where: {
          sourceUrl: { in: Array.from(new Set(urls)) }
        },
        select: {
          sourceUrl: true,
          pool: {
            select: {
              id: true,
              pledgedQty: true,
              targetQty: true
            }
          }
        }
      });
      
      for (const p of productsWithPools) {
        if (p.sourceUrl && p.pool) {
          const progress = p.pool.pledgedQty / p.pool.targetQty;
          externalListingPoolMap.set(p.sourceUrl, {
            pledgedQty: p.pool.pledgedQty,
            targetQty: p.pool.targetQty,
            poolId: p.pool.id,
            progress
          });
        }
      }
    }
  } catch (error) {
    console.error('[PRODUCTS] Error loading pool data for external listings:', error);
  }
  
  // Helper function to extract numeric price from listing
  const extractPrice = (listing: ExternalListing): number => {
    const priceStr = listing.price || '';
    const match = priceStr.match(/[\d,]+(?:\.\d{1,2})?/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  };

  // Helper function to extract MOQ from listing
  const extractMOQ = (listing: ExternalListing): number => {
    const moqStr = listing.moq || '';
    const match = moqStr.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  console.log('[PRODUCTS DEBUG] filteredExt before sort:', filteredExt.length);
  console.log('[PRODUCTS DEBUG] Pool listings in filteredExt:', 
    filteredExt.filter(l => 
      l.url?.includes('Polar-Camera') || 
      l.url?.includes('Batter-Dispenser')
    ).map(l => ({ title: l.title?.substring(0, 40), url: l.url?.substring(0, 60) }))
  );
  console.log('[PRODUCTS DEBUG] externalListingPoolMap size:', externalListingPoolMap.size);
  console.log('[PRODUCTS DEBUG] Pool map entries:', Array.from(externalListingPoolMap.entries()).map(([url, data]) => ({ 
    url: url.substring(0, 60), 
    progress: (data.progress * 100).toFixed(1) + '%' 
  })));
  
  // Stable sort external items to avoid jitter across page navigation
  // PRIORITY: Sort by pool progress FIRST (listings with pools at top)
  filteredExt.sort((a, b) => {
    // First priority: Items with pools come first, sorted by highest pool progress
    const aUrl = String((a as any)?.url || '');
    const bUrl = String((b as any)?.url || '');
    const aPool = externalListingPoolMap.get(aUrl);
    const bPool = externalListingPoolMap.get(bUrl);
    
    // Both have pools - sort by progress (highest first)
    if (aPool && bPool) {
      const progressDiff = bPool.progress - aPool.progress;
      if (progressDiff !== 0) return progressDiff;
    }
    // Only A has pool - A comes first
    if (aPool && !bPool) return -1;
    // Only B has pool - B comes first
    if (!aPool && bPool) return 1;
    
    // Neither has pool - apply normal sorting based on sortParam
    if (sortParam !== 'relevance') {
      switch (sortParam) {
        case 'price-asc': {
          const diff = extractPrice(a) - extractPrice(b);
          if (diff !== 0) return diff;
          break;
        }
        case 'price-desc': {
          const diff = extractPrice(b) - extractPrice(a);
          if (diff !== 0) return diff;
          break;
        }
        case 'moq-asc': {
          const diff = extractMOQ(a) - extractMOQ(b);
          if (diff !== 0) return diff;
          break;
        }
        case 'moq-desc': {
          const diff = extractMOQ(b) - extractMOQ(a);
          if (diff !== 0) return diff;
          break;
        }
        case 'newest': {
          // For newest, we'd need a timestamp - fallback to default sort
          break;
        }
      }
    }
    
    // Default stable sort by title and URL
    const ta = (a.title || '').toString().toLowerCase();
    const tb = (b.title || '').toString().toLowerCase();
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    const ua = (a.url || '').toString();
    const ub = (b.url || '').toString();
    if (ua < ub) return -1;
    if (ua > ub) return 1;
    return 0;
  });

  // Sort by pool progress: highest pledged percentage first (near-MOQ pools at top)
  const sorted = items.sort((a: any, b: any) => {
    const ap = a.pool ? (a.pool.pledgedQty / a.pool.targetQty) : -1;
    const bp = b.pool ? (b.pool.pledgedQty / b.pool.targetQty) : -1;
    // Higher percentage first (closer to MOQ target)
    const progressDiff = bp - ap;
    if (progressDiff !== 0) return progressDiff;
    // If same progress, sort by absolute pledged quantity (higher pledged first)
    const pledgedDiff = (b.pool?.pledgedQty || 0) - (a.pool?.pledgedQty || 0);
    if (pledgedDiff !== 0) return pledgedDiff;
    // Finally, sort by creation date (newer first)
    return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
  });

  // Tab counts
  const countMap: Record<string, number> = counts.reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.sourcePlatform ?? 'UNKNOWN');
    acc[key] = row?._count?._all ?? 0;
    return acc;
  }, {});
  countMap['__all'] = Object.values(countMap).reduce((a: number, b: number) => a + b, 0);

  const exploreUrl = buildExternalSearchUrl(platform, q || '');

  // Transform database products to have external listing structure for unified rendering
  const dbAsExternal = sorted.map((p: any) => {
    let imgs: string[] = [];
    try { imgs = JSON.parse(p.imagesJson || '[]'); } catch {}
    return {
      __dbProduct: true, // marker to identify database products
      id: p.id,
      url: `/p/${p.id}`, // link to pool detail page
      title: p.title,
      price: `${p.unitPrice} ${p.baseCurrency}`,
      description: p.description || '', // add description for MOQ/tier extraction
      image: imgs?.[0] || '/seed/sleeves.jpg',
      storeName: p.supplier?.name || '',
      platform: p.sourcePlatform,
      moq: p.moqQty?.toString() || '',
      __pool: p.pool, // preserve pool data for badges
      __sourceUrl: p.sourceUrl, // preserve source URL
    };
  });

  // Combine database products and external listings for unified pagination
  console.log('[PRODUCTS DEBUG]', {
    dbProducts: sorted.length,
    externalListings: filteredExt.length,
    platform,
    isAllTab,
    whereClause: JSON.stringify(where)
  });
  const combinedItems = [...dbAsExternal, ...filteredExt];
  const total = combinedItems.length;
  console.log('[PRODUCTS DEBUG] Combined total:', total, 'perPage:', perPage, 'page:', page, 'totalPages:', Math.ceil(total / perPage));
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const end = Math.min(total, start + perPage);
  let pageItems = combinedItems.slice(start, end);
  // Preflight ONLY directory IndiaMART links to avoid "Oh no!" dead product pages.
  // Do NOT preflight export.indiamart.com products to avoid rewriting to search pages when blocked.
  if (!FAST && platform === 'INDIAMART' && pageItems.length) {
    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < pageItems.length) {
        const i = idx++;
        const it = pageItems[i];
        try {
          const { url } = await ensureAliveIndiaMartUrl(String(it.url || ''), searchTerm || '', { timeoutMs: 3000 });
          it.url = url;
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pageItems.length) }, () => worker()));
    // Post-preflight: de-duplicate items, preferring export product id when available
    const seen = new Set<string>();
    pageItems = pageItems.filter((it) => {
      const u = String(it.url || '');
      if (!u) return true;
      let key = u;
      try {
        const parsed = new URL(u);
        if (parsed.hostname === 'export.indiamart.com' && parsed.pathname === '/products/') {
          const id = parsed.searchParams.get('id');
          if (id) key = `export:${id}`;
        }
      } catch {}
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  // PERFORMANCE FIX: Use database images only - NO external fetching
  // All images should be pre-cached in SavedListing table during initial ingestion
  try {
    // Simple image mapping - use what's in the database or fallback to seed image
    if (FAST) {
      // DATABASE-ONLY path: No external fetching, use cached data from SavedListing table
      pageItems = await Promise.all(pageItems.map(async (it: any) => {
        let img = String(it.image || '');
        
        // ONLY use existing cached price tiers from detailJson - NO external fetches
        let tiers: { min: number; max?: number; priceText: string; label?: string }[] | undefined;
        try {
          const detailJson = (it as any)?.detailJson;
          if (detailJson && Array.isArray(detailJson.priceTiers) && detailJson.priceTiers.length) {
            tiers = detailJson.priceTiers.map((tier: any) => {
              const range = String(tier.range || '').trim();
              const price = String(tier.price || '').trim();
              let min = 0;
              let max: number | undefined;
              
              // Handle different range formats:
              // 1. "≥ 1" or ">= 500 pieces"
              const gteMatch = range.match(/[≥>=]+\s*(\d+)/);
              // 2. "1 - 99 pieces" or "100 - 199 pieces"
              const rangeMatch = range.match(/(\d+)\s*-\s*(\d+)/);
              // 3. "Minimum order quantity: 2 pairs"
              const moqMatch = range.match(/Minimum order quantity:\s*(\d+)/i);
              
              if (moqMatch) {
                min = parseInt(moqMatch[1]);
              } else if (gteMatch) {
                min = parseInt(gteMatch[1]);
              } else if (rangeMatch) {
                min = parseInt(rangeMatch[1]);
                max = parseInt(rangeMatch[2]);
              }
              
              return { min, max, priceText: price, label: range };
            }).filter((t: any) => t.min > 0);
          }
        } catch {}
        
        // PERFORMANCE FIX: NO external image fetching - use database image or fallback
        // All the Alibaba image enhancement code has been removed
        if (!img) img = '/seed/sleeves.jpg';
        const enriched: any = { ...it, image: img };
        if (tiers) enriched.__tiers = tiers;
        return enriched;
      }));
    } else {
      // PERFORMANCE FIX: ALL image scraping disabled - database-only architecture
      // Use images from SavedListing table or fallback to seed images
      pageItems = pageItems.map((it: any) => {
        let img = String(it.image || '');
        // Simply use the database image or fallback to seed image
        if (!img || img.startsWith('/seed/')) {
          img = '/seed/sleeves.jpg';
        }
        return { ...it, image: img };
      });
    }
    
    // REMOVED: ~200 lines of image scraping/caching code that was causing performance issues
    // All external fetching has been disabled - images come from database only
  } catch {}

  // For each visible item, prefer the SavedListing title (as shown on pool detail pages)
  // so product cards display the curated name instead of noisy provider slugs.
  // We match by URL and also by provider product IDs embedded in URLs for robustness.
  function extractProductKey(u: string): string | null {
    try {
      const url = new URL(u);
      const host = url.hostname.toLowerCase();
      // IndiaMART export products
      if (host === 'export.indiamart.com' && url.pathname === '/products/') {
        const id = url.searchParams.get('id');
        if (id) return `imexp:${id}`;
      }
      // Generic: last path segment, pull long numeric ID if present
      const seg = url.pathname.split('/').filter(Boolean).slice(-1)[0] || '';
      const m = seg.match(/(\d{8,})/);
      if (m) return `num:${m[1]}`;
      return null;
    } catch { return null; }
  }
  // Map external listing URLs (and normalized variants/keys) to saved listing metadata
  // Include both curated saved title and the parsed detail title (used by Pool h1)
  let savedTitleMap = new Map<string, { id: string; title: string; detailTitle?: string }>();
  try {
    const urls = pageItems.map((it) => String((it as any)?.url || '')).filter(Boolean);
    const keys = Array.from(new Set(urls.map(extractProductKey).filter(Boolean) as string[]));
    if ((urls.length || keys.length) && prisma) {
      const or: any[] = [];
      if (urls.length) {
        or.push({ url: { in: Array.from(new Set(urls)) } });
      }
      for (const k of keys) {
        const [kind, val] = k.split(':', 2);
        if (kind === 'imexp') {
          // Match by query id in URL string for export links
          or.push({ url: { contains: `id=${val}` } });
        } else if (kind === 'num') {
          // Match by long numeric ID appearing in the URL path
          or.push({ url: { contains: val } });
        }
      }
      const rows = await prisma.savedListing.findMany({
        where: { OR: or.length ? or : undefined },
        // Pull detailJson so we can prefer the parsed detail title to match Pool page h1
        select: { id: true, url: true, title: true, detailJson: true },
      });
      const map = new Map<string, { id: string; title: string; detailTitle?: string }>();
      for (const r of rows as Array<{ id: string; url: string; title: string; detailJson?: any }>) {
        const detailTitle = (r.detailJson && typeof r.detailJson === 'object') ? String(r.detailJson?.title || '').trim() : '';
        const val = { id: r.id, title: r.title, detailTitle: detailTitle || undefined };
        const raw = String(r.url || '');
        map.set(raw, val);
        try { map.set(normalizeUrl(raw), val); } catch {}
        const key = extractProductKey(raw);
        if (key) map.set(key, val);
      }
      savedTitleMap = map;
    }
  } catch {}

  // Reuse the pool data we already fetched for sorting (externalListingPoolMap)
  // This avoids a duplicate database query
  const listingPoolMap = externalListingPoolMap;

  // PERFORMANCE FIX: Disabled automatic title cleaning that triggers mass scraping on every page load
  // This was causing 30+ fetchProductDetail calls on EVERY /products page view
  // TODO: Move to background job or lazy load on-demand
  const detailTitleMap = new Map<string, string>();
  
  // COMMENTED OUT FOR PERFORMANCE - was causing server overload
  // try {
  //   const needsClean = pageItems.filter((it) => {
  //     const raw = String((it as any)?.title || '');
  //     if (/\.(html?|php|asp|aspx|shtml)\b/i.test(raw)) return true;
  //     if (/\b\d{8,}\b/.test(raw)) return true;
  //     return false;
  // }).slice(0, 30);
  //   if (needsClean.length) {
  // const { fetchProductDetail } = await import('@/lib/providers/detail');
  // const concurrency = 5;
  //     let idx = 0;
  //     async function worker() {
  //       while (idx < needsClean.length) {
  //         const i = idx++;
  //         const it = needsClean[i];
  //         const url = String((it as any)?.url || '');
  //         if (!url) continue;
  //         try {
  //           const det = await fetchProductDetail(url);
  //           const t = String(det?.title || '').trim();
  //           if (t && !/\.(html?|php|asp|aspx|shtml)\b/i.test(t) && !/\b\d{8,}\b/.test(t)) {
  //             detailTitleMap.set(url, t);
  //           }
  //         } catch {}
  //       }
  //     }
  //     await Promise.all(Array.from({ length: Math.min(concurrency, needsClean.length) }, () => worker()));
  //   }
  // } catch {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 relative">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-amber-300/15 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-gradient-to-br from-amber-300/20 to-yellow-300/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-gradient-to-br from-yellow-300/15 to-orange-300/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Side panel host rendered once at page root */}
      <DetailPanelHost />
      {/* Persist and restore grid density (cols) preference */}
      <GridDensityPreference />
      
      <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-16 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Enhanced Header Section */}
        <RevealSection className="sticky top-[72px] z-20 bg-white/80 backdrop-blur-xl border-b-2 border-orange-200/60 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 xl:-mx-16 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-16 py-3 sm:py-6 shadow-lg shadow-orange-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-extrabold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent leading-tight">
                MOQ Pools Marketplace
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Discover wholesale products from verified suppliers worldwide</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/40 border-2 border-orange-400 hover:shadow-xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Live Marketplace
              </div>
            </div>
          </div>
        </RevealSection>

        {/* DISABLED FOR PERFORMANCE - was triggering live scraping on every page load
        {platform === 'INDIAMART' && (
          <IndiaMartWarmFetchClient
            platform={platform}
            q={searchTerm}
            enabled={true}
            headlessDefault={headless}
            per={perPage}
            initialCount={uniqExt.length}
          />
        )}
        */}

        <SourceTabs counts={countMap} />
        
        {/* Enhanced Search and Trust Badges */}
        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative">
              <SearchBar placeholder={`Search ${platformLabel(platform) || 'All platforms'}…`} />
            </div>
          </div>
        </div>

      {/* Enhanced Categories and filters */}
      <div className="space-y-6 relative z-10">
        {/* Enhanced Filters Row */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-300/30 to-amber-300/30 rounded-3xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 border-2 border-orange-200/60 shadow-xl shadow-orange-500/5 z-20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CategoryDropdown platform={platform} currentQuery={q} />
                <FiltersBar />
              </div>
            <div className="flex items-center gap-4 ms-auto flex-wrap">
              <SortDropdown />
              <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-semibold text-sm border border-orange-200">
                {formatNumberEN(filteredExt.length)} listings
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Listings Header */}
        <div className="flex items-center justify-between mb-4 mt-6">
          <h2 className="text-xl font-bold text-gray-900">
            {platform === 'ALL' ? '🌐 All Marketplace Listings' : `${platformLabel(platform)} Listings`}
          </h2>
        </div>
        {STRICT_OFFLINE === '1' ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Offline mode: showing only pre-ingested items. Use catalog:ingest and catalog:cache-images to add more.
          </div>
        ) : filteredExt.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            No live listings yet. Pick a category above or use the search box.
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">Showing {start + 1}-{end} of {total} · Page {page} / {totalPages}</div>
            {total === 0 ? (
              <EmptyState title="No listings found" subtitle="Try a different query or relax your filters." actionHref="/products" actionLabel="Reset filters" />
            ) : (
            <RevealSection className={`${gridColsClass} gap-2 sm:gap-4 md:gap-6 auto-rows-fr items-stretch relative z-0`}>
              {pageItems.map((it, idx) => {
                const rawUrl = String((it as any)?.url || '');
                const savedForUrl = savedTitleMap.get(rawUrl) || savedTitleMap.get(normalizeUrl(rawUrl)) || savedTitleMap.get(extractProductKey(rawUrl) || '__nope__');
                const savedTitleRaw = savedForUrl?.title;
                const savedDetailTitleRaw = savedForUrl?.detailTitle;
                const detailTitleRaw = detailTitleMap.get(rawUrl);
                // Prefer the same title used on Pool pages: detail.title (when present), then saved title
                const titleBase = savedDetailTitleRaw || savedTitleRaw || detailTitleRaw || computeDisplayTitle(it);
                const title = cleanTitleString(titleBase) || computeDisplayTitle(it);
                const savedId = (it as any)?.savedId || savedForUrl?.id;
                const { min: qMin } = extractMinMaxQty(it);
                const combined = [it.price, it.description, it.title].filter(Boolean).join(' ');
                const tiers = ((it as any).__tiers as any[]) || ((): { min: number; max?: number; priceText: string; label?: string }[] => {
                  const s = combined.replace(/\s+/g, ' ').trim();
                  if (!s) return [];
                  const arr: { min: number; max?: number; priceText: string; label?: string }[] = [];
                  const re = /(?:(?:≥|>=)\s*(\d{1,7})|(\d{1,7})\s*[-~–]\s*(\d{1,7}))\s*(?:pcs?|pieces?|units?|bags?|sets?)?\b[^$¥￥USDCNYRMB]*((?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)/gi;
                  let m: RegExpExecArray | null;
                  while ((m = re.exec(s))) {
                    const gteMin = m[1];
                    const minStr = m[2];
                    const maxStr = m[3];
                    const priceText = m[4];
                    if (gteMin) {
                      const min = Number(gteMin.replace(/,/g, ''));
                      if (Number.isFinite(min)) arr.push({ min, priceText, label: `≥${min}` });
                    } else if (minStr) {
                      const min = Number(minStr.replace(/,/g, ''));
                      const max = Number((maxStr || '').replace(/,/g, ''));
                      if (Number.isFinite(min)) arr.push({ min, max: Number.isFinite(max) ? max : undefined, priceText, label: Number.isFinite(max) ? `${min}-${max}` : `≥${min}` });
                    }
                  }
                  // Fallback: use the SSR multi-line-aware extractor to derive tiers when compact parsing fails
                  if (!arr.length) {
                    const tiers2 = extractQtyTiers(it).map(t => ({
                      min: t.min,
                      max: t.max,
                      priceText: t.price ? `US$${t.price}` : '',
                      label: t.max != null ? `${t.min}-${t.max}` : `≥${t.min}`,
                    }));
                    for (const x of tiers2) arr.push(x);
                  }
                  const map = new Map<number, { min: number; max?: number; priceText: string; label?: string }>();
                  for (const t of arr) { if (!map.has(t.min)) map.set(t.min, t); }
                  return Array.from(map.values()).sort((a, b) => a.min - b.min);
                })();

                const isDbProduct = (it as any).__dbProduct;
                const LinkComponent = isDbProduct ? Link : 'a';
                const linkProps = isDbProduct 
                  ? { href: it.url || '#' }
                  : { href: it.url || '#', target: '_blank' as const, rel: 'noreferrer' };

                // Calculate price display for use in buttons
                const primary = it.price && it.price.toString().trim().length ? it.price : '';
                let priceDisplay = primary;
                
                // If we have price tiers, show full price range (min-max)
                if (tiers && tiers.length >= 1) {
                  // Extract all prices from tiers and find min/max
                  const prices: number[] = [];
                  for (const tier of tiers) {
                    const priceText = tier.priceText || '';
                    // Extract ALL numeric prices from text like "US$318" or "$313" or "US$0.20" or "US$0.40 - US$0.45"
                    const matches = priceText.matchAll(/[\d,]+(?:\.\d{1,2})?/g);
                    for (const match of matches) {
                      const priceVal = parseFloat(match[0].replace(/,/g, ''));
                      if (!isNaN(priceVal) && priceVal > 0) prices.push(priceVal);
                    }
                  }
                  
                  if (prices.length > 0) {
                    // Extract currency symbol from first tier
                    const currencyMatch = tiers[0].priceText?.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)/);
                    const currency = currencyMatch ? currencyMatch[0] : 'US$';
                    
                    if (prices.length === 1) {
                      // Single price tier
                      priceDisplay = `${currency}${prices[0]}`;
                    } else {
                      // Multiple price tiers - show range from lowest to highest
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);
                      priceDisplay = `${currency}${minPrice}-${currency}${maxPrice}`;
                    }
                  }
                }
                
                // Fallback price extraction if still no display
                if (!priceDisplay) {
                  const combined = `${it.price || ''} ${it.title || ''} ${it.description || ''}`;
                  // 1) Currency + amount (broadened to allow "US $")
                  let m = combined.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/);
                  if (m) priceDisplay = m[0];
                  // 2) Bare numeric range like "1.20 - 2.00" -> prefix with US$ for MIC
                  if (!priceDisplay) {
                    const range = combined.match(/\b(\d{1,4}(?:[\.,]\d{1,2})?)\s*[-~–]\s*(\d{1,4}(?:[\.,]\d{1,2})?)\b/);
                    if (range) {
                      let prefix = '';
                      try { const u = new URL(String(it.url || '')); if (u.hostname.toLowerCase().includes('made-in-china')) prefix = 'US$'; } catch {}
                      priceDisplay = `${prefix}${range[1]}-${prefix}${range[2]}`;
                    }
                  }
                }

                // Generate unique product ID
                const productIdForCard = savedId || (isDbProduct ? (it as any).id : undefined) || String(it.url || `external-${idx}`);

                return (
                  <RevealItem key={keyFromListing(it, idx)}>
                    {/* Enhanced Product Card */}
                    <div className="group relative h-full">
                      {/* Enhanced gradient glow on hover */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 rounded-2xl blur-sm opacity-0 group-hover:opacity-40 transition-all duration-500"></div>
                      
                      <div className="relative rounded-2xl overflow-hidden bg-white/98 backdrop-blur-sm border-2 border-orange-200/50 shadow-lg hover:shadow-2xl hover:shadow-orange-500/15 transition-all duration-300 hover:-translate-y-2 min-h-[600px] flex flex-col">
                      {/* Main clickable block - now goes to pool page */}
                      <Link href={savedId ? `/pools/${savedId}` : (it.url || '#')} className="block flex-1 flex flex-col p-6 pb-4">
                        {(() => {
                          // Avoid sleeves on ALL; never pass sleeves to Image
                          const isSeedish = (u?: string | null) => {
                            if (!u) return false;
                            try { const dec = decodeURIComponent(u); return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(dec); } catch { return /(?:^|\/)?seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(u); }
                          };
                          const raw = String(it.image || '');
                          // On ALL tab, avoid sleeves. If only sleeve remains, render nothing to avoid misleading image.
                          const fallback = isAllTab ? '' : (resolveFallbackImage(raw, it.title || title, it.description || '') || '');
                          const candidates = [raw, fallback].filter(Boolean) as string[];
                          const best = candidates.find(u => !!u && !isSeedish(u) && !isClearlyNonProductImage(u) && !(u.startsWith('/cache/') && isBadImageHashFromPath(u)));
                          const src = best || '/seed/sleeves.jpg';
                          return (
                            <div className="relative h-32 sm:h-40 md:h-52 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-lg sm:rounded-xl mb-2 sm:mb-3 overflow-hidden border border-orange-100/60 shadow-sm">
                              {/* Enhanced hover gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                              <Image
                                src={src}
                                alt={title || it.title || 'Listing image'}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                referrerPolicy="no-referrer"
                                unoptimized
                                priority={false}
                              />
                              {/* Platform badge with logo */}
                              {it.url ? (() => {
                                try {
                                  const u = new URL(String(it.url));
                                  const host = u.hostname.toLowerCase();
                                  const code = host.includes('alibaba') ? 'ALIBABA' : host.includes('1688') ? 'C1688' : host.includes('made-in-china') ? 'MADE_IN_CHINA' : host.includes('indiamart') ? 'INDIAMART' : host.replace('www.', '').toUpperCase();
                                  return (
                                    <div className="absolute top-3 left-3 z-20">
                                      <PlatformBadge code={code} className="text-xs shadow-xl backdrop-blur-sm" />
                                    </div>
                                  );
                                } catch { return null; }
                              })() : null}
                            </div>
                          );
                        })()}
                        <div className="h-4 sm:h-5 text-[10px] sm:text-xs text-gray-500 truncate mb-1 sm:mb-2 font-medium flex items-center" title={it.storeName || ''}>{it.storeName || 'Marketplace Store'}</div>
                        <div className="h-10 sm:h-12 md:h-16 font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3 leading-tight overflow-hidden" title={title}>{title || 'See listing'}</div>
                        {(() => {
                          const primary = it.price && it.price.toString().trim().length ? it.price : '';
                          let display = primary;
                          
                          // If we have price tiers, show full price range (min-max)
                          if (tiers && tiers.length >= 1) {
                            // Extract all prices from tiers and find min/max
                            const prices: number[] = [];
                            for (const tier of tiers) {
                              const priceText = tier.priceText || '';
                              // Extract ALL numeric prices from text like "US$318" or "$313" or "US$0.20" or "US$0.40 - US$0.45"
                              const matches = priceText.matchAll(/[\d,]+(?:\.\d{1,2})?/g);
                              for (const match of matches) {
                                const price = parseFloat(match[0].replace(/,/g, ''));
                                if (!isNaN(price) && price > 0) prices.push(price);
                              }
                            }
                            
                            if (prices.length > 0) {
                              // Extract currency symbol from first tier
                              const currencyMatch = tiers[0].priceText?.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)/);
                              const currency = currencyMatch ? currencyMatch[0] : 'US$';
                              
                              if (prices.length === 1) {
                                // Single price tier
                                display = `${currency}${prices[0]}`;
                              } else {
                                // Multiple price tiers - show range from lowest to highest
                                const minPrice = Math.min(...prices);
                                const maxPrice = Math.max(...prices);
                                display = `${currency}${minPrice}-${currency}${maxPrice}`;
                              }
                            }
                          }
                          
                          // Fallback price extraction if still no display
                          if (!display) {
                            const combined = `${it.price || ''} ${it.title || ''} ${it.description || ''}`;
                            // 1) Currency + amount (broadened to allow "US $")
                            let m = combined.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/);
                            if (m) display = m[0];
                            // 2) Bare numeric range like "1.20 - 2.00" -> prefix with US$ for MIC
                            if (!display) {
                              const range = combined.match(/\b(\d{1,4}(?:[\.,]\d{1,2})?)\s*[-~–]\s*(\d{1,4}(?:[\.,]\d{1,2})?)\b/);
                              if (range) {
                                let prefix = '';
                                try { const u = new URL(String(it.url || '')); if (u.hostname.toLowerCase().includes('made-in-china')) prefix = 'US$'; } catch {}
                                display = `${prefix}${range[1]}-${prefix}${range[2]}`;
                              }
                            }
                          }
                          const soldText = displayOrdersAsSold((it as any)?.orders);
                          return (
                            <div className="h-8 sm:h-10 flex items-baseline gap-1 sm:gap-2 mb-2 sm:mb-3">
                              <div className="text-sm sm:text-lg md:text-xl font-extrabold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                                {display ? `${display}` : 'See listing'}
                              </div>
                              {soldText ? (
                                <div className="text-xs text-gray-600 font-semibold">{soldText}</div>
                              ) : null}
                            </div>
                          );
                        })()}
                        {(() => {
                          try {
                            // Check if this listing has a pool via the listingPoolMap
                            const listingUrl = String((it as any)?.url || '');
                            const poolData = listingPoolMap.get(listingUrl);
                            
                            let current = 0;
                            let target = 100;
                            
                            if (poolData) {
                              // Use real pool data if available
                              current = poolData.pledgedQty;
                              target = poolData.targetQty;
                            } else {
                              // Fallback: Compute a reasonable MOQ target from tiers
                              const tierArr = Array.isArray(tiers) ? tiers : [];
                              const sortedTiers = [...tierArr].sort((a: any, b: any) => (a?.min ?? 0) - (b?.min ?? 0));
                              const hasHigherThanOne = sortedTiers.some((t: any) => (t?.min ?? 0) > 1);
                              const visibleTiers = hasHigherThanOne ? sortedTiers.filter((t: any) => (t?.min ?? 0) > 1) : sortedTiers;
                              const mins = visibleTiers.map((t: any) => t?.min).filter((n: any) => typeof n === 'number' && Number.isFinite(n) && n > 1) as number[];
                              const inferredMoqMin = mins.length ? Math.min(...mins) : (typeof qMin === 'number' && qMin > 1 ? qMin : null);
                              target = inferredMoqMin && inferredMoqMin > 1 ? inferredMoqMin : 100;
                            }
                            
                            const percent = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
                            return (
                              <div className="h-16 mb-3 space-y-3">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600 font-bold">Pool Progress</span>
                                  <span className="font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">{formatNumberEN(current)}/{formatNumberEN(target)}</span>
                                </div>
                                <div className="relative h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden border border-gray-300/50 shadow-inner">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 transition-all duration-500 rounded-full shadow-lg shadow-emerald-500/30" 
                                    style={{ width: `${percent}%` }} // Dynamic pool progress
                                  />
                                </div>
                              </div>
                            );
                          } catch {
                            // Fallback UI if anything goes wrong
                            return (
                              <div className="h-16 mb-3 space-y-3">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600 font-bold">Pool Progress</span>
                                  <span className="font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">0/100</span>
                                </div>
                                <div className="relative h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden border border-gray-300/50 shadow-inner">
                                  <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 transition-all duration-500 rounded-full shadow-lg shadow-emerald-500/30 w-0"></div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                        <div className="h-10 mb-2 flex items-center">
                          <SyncedCountdown size="md" variant="accent" showIcon={true} />
                        </div>
                      </Link>
                      {/* Enhanced CTA row (sibling to avoid nested links) */}
                      <div className="p-2 sm:p-4 md:p-6 pt-2 sm:pt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mt-auto border-t border-gray-100/60">
                        <a 
                          href={it.url || '#'} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="group/btn relative flex-1 min-w-[80px] sm:min-w-[120px] inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></span>
                          <span className="relative flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            View Original
                          </span>
                        </a>
                        {it.url && ((it.url as string).includes('alibaba.com') || (it.url as string).includes('made-in-china.com') || (it.url as string).includes('indiamart.com')) ? (
                          <DetailLink url={String(it.url)} title={title} className="flex-1 min-w-[70px] sm:min-w-[90px] px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 rounded-lg sm:rounded-xl border border-orange-200/60 hover:border-orange-500 hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 transition-all duration-300 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 hover:shadow-lg text-center" />
                        ) : (
                          <a href={it.url || '#'} target="_blank" rel="noreferrer" className="flex-1 min-w-[70px] sm:min-w-[90px] px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 rounded-lg sm:rounded-xl border border-orange-200/60 hover:border-orange-500 hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 transition-all duration-300 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 hover:shadow-lg text-center">
                            Details
                          </a>
                        )}
                        <ProductCardButtons
                          savedListingId={savedId}
                          productId={productIdForCard}
                          productTitle={title}
                          productImage={it.image || ''}
                          productUrl={savedId ? `/pools/${savedId}` : (it.url || '#')}
                          productPrice={priceDisplay}
                          productMoq={qMin}
                          platform={it.platform}
                        />
                        <AdminActions
                          savedListingId={savedId}
                          productUrl={it.url || ''}
                          productTitle={title}
                        />
                      </div>
                    </div>
                    </div>
                  </RevealItem>
                );
              })}
            </RevealSection>
            )}

            {/* Pagination controls */}
            {(() => {
              const buildUrl = (p: number) => {
                const usp = new URLSearchParams();
                if (platform && platform !== 'ALL') usp.set('platform', platform);
                if (q) usp.set('q', q);
                if (Number.isFinite(minPriceQ) && minPriceQ > 0) usp.set('minPrice', String(minPriceQ));
                if (Number.isFinite(maxPriceQ) && maxPriceQ > 0) usp.set('maxPrice', String(maxPriceQ));
                if (Number.isFinite(minMoqQ) && minMoqQ > 0) usp.set('minMoq', String(minMoqQ));
                if (Number.isFinite(maxMoqQ) && maxMoqQ > 0) usp.set('maxMoq', String(maxMoqQ));
                usp.set('per', String(perPage));
                usp.set('page', String(p));
                return `/products?${usp.toString()}`;
              };
              const windowPages = 5;
              const half = Math.floor(windowPages / 2);
              let pStart = Math.max(1, page - half);
              let pEnd = Math.min(totalPages, pStart + windowPages - 1);
              pStart = Math.max(1, Math.min(pStart, Math.max(1, pEnd - windowPages + 1)));
              return (
                <RevealSection className="flex items-center justify-center gap-3 mt-10 mb-6">
                  <a 
                    href={buildUrl(Math.max(1, page - 1))} 
                    className={`group relative px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      page <= 1 
                        ? 'pointer-events-none opacity-40 bg-gray-100 text-gray-400' 
                        : 'bg-white border-2 border-orange-200/60 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                      Previous
                    </span>
                  </a>
                  {Array.from({ length: pEnd - pStart + 1 }, (_, i) => pStart + i).map((p) => (
                    <a 
                      key={p} 
                      href={buildUrl(p)} 
                      className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                        p === page 
                          ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white shadow-xl shadow-orange-500/40 scale-110 border-2 border-orange-400' 
                          : 'bg-white border-2 border-orange-200/60 text-gray-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 hover:shadow-lg hover:scale-105'
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                  <a 
                    href={buildUrl(Math.min(totalPages, page + 1))} 
                    className={`group relative px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      page >= totalPages 
                        ? 'pointer-events-none opacity-40 bg-gray-100 text-gray-400' 
                        : 'bg-white border-2 border-orange-200/60 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      Next
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </span>
                  </a>
                </RevealSection>
              );
            })()}
          </>
        )}
      </div>

      {/* Curated pools section - now integrated into main listing above */}
      <div className="mt-6 hidden">
  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Pools on {platform === 'ALL' ? 'All Platforms' : platformLabel(platform)}</h2>

        {sorted.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm">No pools yet. Try Explore below.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((p: any) => {
              const progress = p.pool ? Math.min(100, Math.round((p.pool.pledgedQty / p.pool.targetQty) * 100)) : 0;
              let imgs: string[] = [];
              try { imgs = JSON.parse(p.imagesJson || '[]'); } catch {}
              const src = imgs?.[0];

              return (
                <Link key={p.id} href={`/p/${p.id}`} className="border rounded-xl p-3 hover:shadow-sm transition">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {src ? <img src={src} alt={p.title} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{p.supplier?.name}</div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm mt-1">{price(p.unitPrice)} {p.baseCurrency} / unit</div>

                  <div className="flex items-center gap-2 mt-2">
                    <PlatformBadge code={(p as any)?.sourcePlatform} />
                    {p.sourceUrl ? (
                      <span className="text-xs text-blue-600 underline">Listing</span>
                    ) : null}
                  </div>

                  {p.pool ? (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black progress-w" data-w={`${progress}%`} />
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {p.pool.pledgedQty}/{p.pool.targetQty} pledged · {progress}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">No active pool</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {platform !== 'ALL' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Explore on {platformLabel(platform)}
            </h2>
            {exploreUrl ? (
              <a className="text-sm font-semibold text-orange-600 hover:text-orange-700 underline transition-colors" href={exploreUrl} target="_blank" rel="noreferrer">
                Open in {platformLabel(platform)} →
              </a>
            ) : null}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Search opens the official site with your query. Curate hot listings into pools.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
