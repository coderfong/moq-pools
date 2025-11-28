import NextDynamic from 'next/dynamic';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
// Client-only UI that uses next/navigation hooks – load on client to avoid SSR hook errors
// (prevents usePathname/useSearchParams from running during SSR)
const SourceTabs = NextDynamic(() => import('@/components/SourceTabs'), { ssr: false });
const SearchBar = NextDynamic(() => import('@/components/SearchBar'), { ssr: false });
import { buildExternalSearchUrl, platformLabel } from '@/lib/sourceLinks';
const CategoryDropdown = NextDynamic(() => import('@/components/CategoryDropdown'), { ssr: false });
const FiltersBar = NextDynamic(() => import('@/components/FiltersBar'), { ssr: false });
// Removed client infinite scrolling in favor of page-based pagination
import type { ExternalListing } from '@/lib/providers/types';
import { getLatestSearchSnapshot, querySavedListings } from '@/lib/listingStore';
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
const GridDensityPreference = NextDynamic(() => import('@/components/GridDensityPreference'), { ssr: false });
import { formatNumberEN } from '@/lib/format';
const Countdown = NextDynamic(() => import('@/components/Countdown'), { ssr: false });
import TrustBadges from '@/components/TrustBadges';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const price = (x: any) => (x?.toString?.() ?? String(x));

export default async function Products({ searchParams }: { searchParams: { platform?: string, lplatform?: string, q?: string, lk?: string, minPrice?: string, maxPrice?: string, minMoq?: string, maxMoq?: string, moqLeft?: string, page?: string, per?: string, cols?: string } }) {
  // Fast mode: skip live external fetches and heavy image enrichment on first load for instant TTFB
  const FAST = !/^(0|false|no)$/i.test(String((searchParams as any).fast || process.env.NEXT_PUBLIC_FAST_LISTINGS || '1'));
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
  // Columns per row (desktop). Options limited to ensure Tailwind classes are present.
  const colsQ = Number((searchParams as any).cols || '');
  const selectedCols = ([5,6,7,8] as number[]).includes(colsQ) ? colsQ : 5;
  const GRID_COLS: Record<number, string> = {
    5: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5',
    6: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6',
    7: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 xl:grid-cols-7 2xl:grid-cols-7',
    8: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-8',
  };
  const gridColsClass = GRID_COLS[selectedCols] || GRID_COLS[4];
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
    // IMPORTANT: DB enum doesn't include INDIAMART_EXPORT. Only filter on known DB platforms.
    sourcePlatform: { in: (isAllTab ? ALL_ALLOWED_PLATFORMS : ['ALIBABA','C1688','MADE_IN_CHINA','INDIAMART','GLOBAL_SOURCES']) as any },
    NOT: [{ sourceUrl: null }],
  };
  if (platform !== 'ALL') where.sourcePlatform = platform;
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
  (hasDb && prisma ? withTimeout(prisma.product.groupBy({ by: ['sourcePlatform'], where: { isActive: true, moqQty: { gt: 0 }, sourcePlatform: { in: (isAllTab ? ALL_ALLOWED_PLATFORMS : ['ALIBABA','C1688','MADE_IN_CHINA','INDIAMART','GLOBAL_SOURCES']) as any } }, _count: { _all: true } }), 5000, 'db:groupBy').catch(() => []) : Promise.resolve([])) as Promise<any[]>,
    (async (): Promise<ExternalListing[]> => {
      try {
        // 0) Local SavedListings (do not early-return unless we have a reasonably sized set)
        const saved = await querySavedListings({
          q: searchTerm,
          platform,
          categories: [],
          offset: 0,
          limit: Math.min(500, perPage * 2),
        });
        const MIN_EXCLUSIVE_SAVED = 12; // threshold at which we can skip live augmentation

        // 1) Latest snapshot (if any)
        const snap = await getLatestSearchSnapshot({
          q: searchTerm,
          platform,
          filters: {
            minPrice: Number.isFinite(minPriceQ) ? minPriceQ : undefined,
            maxPrice: Number.isFinite(maxPriceQ) ? maxPriceQ : undefined,
            minMoq: Number.isFinite(minMoqQ) ? minMoqQ : undefined,
            maxMoq: Number.isFinite(maxMoqQ) ? maxMoqQ : undefined,
          },
          offset: 0,
          limit: Math.min(500, perPage * 2),
        }).catch(() => null);
        const snapshotItems: ExternalListing[] = snap?.items || [];
        if (FAST) {
          // Fast path: do not hit live external aggregate. Use snapshot and saved only.
          if (snapshotItems.length || saved.length) {
            const seen = new Set<string>();
            return [...saved, ...snapshotItems].filter(it => { const k = it.url || it.title; if (!k || seen.has(k)) return false; seen.add(k); return true; });
          }
          // Exceptions in FAST mode to avoid an empty UI when nothing cached:
          // 1) IndiaMART Export: fetch cards directly
          if (platform === 'INDIAMART_EXPORT' && searchTerm) {
            try {
              const { fetchExportSearchCards } = await import('@/lib/providers/indiamartExport');
              const exp = await fetchExportSearchCards(searchTerm, false);
              if (Array.isArray(exp) && exp.length) return exp;
            } catch {}
          }
          // 2) IndiaMART (dir): run a lightweight provider fetch (no headless, no image upgrades)
          if (platform === 'INDIAMART' && searchTerm) {
            try {
              const { fetchIndiaMart } = await import('@/lib/providers/indiamart');
              const prov = await fetchIndiaMart(searchTerm, Math.min(80, perPage), { headless: false, upgradeImages: false, cacheImages: false, debug: false });
              if (Array.isArray(prov) && prov.length) return prov;
            } catch {}
          }
          return [];
        } else {
          // 2) Live prefetch aggregate for augmentation (original behavior)
          try {
            const usp = new URLSearchParams();
            usp.set('platform', platform);
            if (searchTerm) usp.set('q', searchTerm);
            const prefetchMode = platform === 'INDIAMART';
            if (prefetchMode) {
              usp.set('limit', '60');
              usp.set('prefetch', '1');
            } else {
              usp.set('limit', String(Math.min(200, perPage * 2)));
              usp.set('headless', headless ? '1' : '0');
            }
            const envBase = process.env.NEXT_PUBLIC_BASE_URL || '';
            let base = envBase.trim();
            if (!base) {
              try {
                const h = headers();
                const host = h.get('x-forwarded-host') || h.get('host') || '';
                const proto = h.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
                if (host) base = `${proto}://${host}`;
              } catch {}
            }
            const url = `${base || ''}/api/external/aggregate?${usp.toString()}`;
            let absUrl: string;
            if (/^https?:\/\//i.test(url)) {
              absUrl = url;
            } else {
              try {
                const h = headers();
                const host = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
                const proto = h.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
                absUrl = `${proto}://${host}${url.startsWith('/') ? '' : '/'}${url}`;
              } catch {
                const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                absUrl = `${base.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
              }
            }
            const res = await Promise.race([
              fetch(absUrl, { cache: 'no-store' }),
              new Promise<Response | null>((resolve) => setTimeout(() => resolve(null), 5000)),
            ]).catch(() => null) as Response | null;
            let preItems: ExternalListing[] = [];
            if (res?.ok) {
              const data = await res.json().catch(() => null);
              if (Array.isArray(data?.items)) preItems = data.items as ExternalListing[];
              if (prefetchMode && preItems.length) {
                (async () => {
                  try {
                    const usp2 = new URLSearchParams();
                    usp2.set('platform', platform);
                    if (searchTerm) usp2.set('q', searchTerm);
                    usp2.set('limit', String(Math.min(200, perPage * 2)));
                    usp2.set('headless', headless ? '1' : '0');
                    const fullUrl = `${base || ''}/api/external/aggregate?${usp2.toString()}`;
                    await Promise.race([
                      fetch(fullUrl, { cache: 'no-store' }),
                      new Promise((resolve) => setTimeout(resolve, 7000)),
                    ]).catch(() => null);
                  } catch {}
                })();
              }
            }
            const merge = (...sets: ExternalListing[][]) => {
              const out: ExternalListing[] = [];
              const seen = new Set<string>();
              for (const s of sets) {
                for (const it of s) {
                  const key = it.url || it.title;
                  if (!key || seen.has(key)) continue;
                  seen.add(key);
                  out.push(it);
                }
              }
              return out;
            };
            const merged = merge(saved, snapshotItems, preItems);
            if (merged.length) return merged;
            // Direct provider fallback for IndiaMART when aggregate/snapshot saved are empty
            if (platform === 'INDIAMART' && searchTerm) {
              try {
                const { fetchIndiaMart } = await import('@/lib/providers/indiamart');
                const prov = await fetchIndiaMart(searchTerm, Math.min(200, perPage * 2), { headless, upgradeImages: false, cacheImages: false, debug: false });
                if (Array.isArray(prov) && prov.length) return prov;
              } catch {}
            }
            // Export tab: use export search cards directly
            if (platform === 'INDIAMART_EXPORT' && searchTerm) {
              try {
                const { fetchExportSearchCards } = await import('@/lib/providers/indiamartExport');
                const exp = await fetchExportSearchCards(searchTerm, false);
                if (Array.isArray(exp) && exp.length) return exp;
              } catch {}
            }
          } catch {}
          if (snapshotItems.length) {
            const seen = new Set<string>();
            return [...saved, ...snapshotItems].filter(it => { const k = it.url || it.title; if (!k || seen.has(k)) return false; seen.add(k); return true; });
          }
          return saved;
        }
      } catch {}
      return [];
    })(),
  ]) as unknown as [Item[], CountRow[], ExternalListing[]];

  // Server-side last-mile upgrade for IndiaMART images on ALL tab:
  // If any IndiaMART listing is missing an image or has a seed/bad cached hash, attempt to
  // fetch its detail main image and cache it to a local /cache path to ensure SSR shows a thumbnail.
  if (!FAST && isAllTab && Array.isArray(extItems) && extItems.length) {
    const toFix = extItems.filter((it) => {
      try {
        const plat = String(it.platform || '').toUpperCase();
        const img = String(it.image || '');
        const missing = !img || img.startsWith('/seed/');
        const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
        return plat === 'INDIAMART' && (missing || bad);
      } catch { return false; }
    }).slice(0, 80);
    if (toFix.length) {
      const concurrency = 4;
      let idx = 0;
      async function worker() {
        while (idx < toFix.length) {
          const i = idx++;
          const it = toFix[i];
          try {
            const { getIndiaMartDetailMainImage } = await import('@/lib/providers/indiamart');
            const best = await getIndiaMartDetailMainImage(String(it.url || ''));
            if (best) {
              const { cacheExternalImage } = await import('@/lib/imageCache');
              const cached = await cacheExternalImage(best, { preferJpgForIndiaMart: true });
              if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
                it.image = cached.localPath;
              }
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, toFix.length) }, () => worker()));
    }
  }

  // Server-side last-mile upgrade for Alibaba images on ALL tab:
  // Ensure Alibaba cards render with a local /cache image instead of placeholders when possible
  if (!FAST && isAllTab && Array.isArray(extItems) && extItems.length) {
    const toFixAli = extItems.filter((it) => {
      try {
        const plat = String(it.platform || '').toUpperCase();
        const img = String(it.image || '');
        const missing = !img || img.startsWith('/seed/');
        const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
        return plat === 'ALIBABA' && (missing || bad);
      } catch { return false; }
    }).slice(0, 80);
    if (toFixAli.length) {
      const concurrency = 4;
      let idx = 0;
      async function worker() {
        while (idx < toFixAli.length) {
          const i = idx++;
          const it = toFixAli[i];
          try {
            const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
            const best = await getAlibabaDetailFirstJpg(String(it.url || ''));
            if (best) {
              const { cacheExternalImage } = await import('@/lib/imageCache');
              const cached = await cacheExternalImage(best);
              if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
                it.image = cached.localPath;
              }
            } else {
              // Fallback: try generic resolver which also caches to /cache
              try {
                const api = `/api/external/resolve-img?src=${encodeURIComponent(String(it.url || ''))}`;
                let abs = api;
                try {
                  const h = headers();
                  const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
                  const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
                  abs = `${proto}://${hostH}${api}`;
                } catch {
                  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
                  abs = `${base}${api}`;
                }
                const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
                if (resp?.ok) {
                  const data = await resp.json().catch(() => null);
                  const lp = data?.localPath as string | undefined;
                  if (lp && !isBadImageHashFromPath(lp)) it.image = lp;
                }
              } catch {}
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, toFixAli.length) }, () => worker()));
    }
  }

  // Same last-mile image upgrade when specifically on the ALIBABA tab
  if (!FAST && platform === 'ALIBABA' && Array.isArray(extItems) && extItems.length) {
    const toFixAli2 = extItems.filter((it) => {
      try {
        const plat = String(it.platform || '').toUpperCase();
        if (plat !== 'ALIBABA') return false;
        const img = String(it.image || '');
        const missing = !img || img.startsWith('/seed/');
        const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
        return missing || bad;
      } catch { return false; }
    }).slice(0, 80);
    if (toFixAli2.length) {
      const concurrency = 4;
      let idx = 0;
      async function worker() {
        while (idx < toFixAli2.length) {
          const i = idx++;
          const it = toFixAli2[i];
          try {
            const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
            const best = await getAlibabaDetailFirstJpg(String(it.url || ''));
            if (best) {
              const { cacheExternalImage } = await import('@/lib/imageCache');
              const cached = await cacheExternalImage(best);
              if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
                it.image = cached.localPath;
              }
            } else {
              // Fallback: try generic resolver which also caches to /cache
              try {
                const api = `/api/external/resolve-img?src=${encodeURIComponent(String(it.url || ''))}`;
                let abs = api;
                try {
                  const h = headers();
                  const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
                  const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
                  abs = `${proto}://${hostH}${api}`;
                } catch {
                  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
                  abs = `${base}${api}`;
                }
                const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
                if (resp?.ok) {
                  const data = await resp.json().catch(() => null);
                  const lp = data?.localPath as string | undefined;
                  if (lp && !isBadImageHashFromPath(lp)) it.image = lp;
                }
              } catch {}
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, toFixAli2.length) }, () => worker()));
    }
  }

  // Same last-mile image upgrade when specifically on the INDIAMART tab
  if (!FAST && platform === 'INDIAMART' && Array.isArray(extItems) && extItems.length) {
    const toFix2 = extItems.filter((it) => {
      try {
        const plat = String(it.platform || '').toUpperCase();
        if (plat !== 'INDIAMART') return false;
        const img = String(it.image || '');
        const missing = !img || img.startsWith('/seed/');
        const bad = img.startsWith('/cache/') && isBadImageHashFromPath(img);
        return missing || bad;
      } catch { return false; }
    }).slice(0, 80);
    if (toFix2.length) {
      const concurrency = 4;
      let idx = 0;
      async function worker() {
        while (idx < toFix2.length) {
          const i = idx++;
          const it = toFix2[i];
          try {
            const { getIndiaMartDetailMainImage } = await import('@/lib/providers/indiamart');
            const best = await getIndiaMartDetailMainImage(String(it.url || ''));
            if (best) {
              const { cacheExternalImage } = await import('@/lib/imageCache');
              const cached = await cacheExternalImage(best, { preferJpgForIndiaMart: true });
              if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
                it.image = cached.localPath;
              }
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, toFix2.length) }, () => worker()));
    }
  }

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
  const targetCount = Math.min(perPage * page, perPage * Math.max(1, page));

  // Stable sort external items to avoid jitter across page navigation
  filteredExt.sort((a, b) => {
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

  // Near‑MOQ first
  const sorted = items.sort((a: any, b: any) => {
    const ap = a.pool ? a.pool.pledgedQty / a.pool.targetQty : 0;
    const bp = b.pool ? b.pool.pledgedQty / b.pool.targetQty : 0;
    return bp - ap;
  });

  // Tab counts
  const countMap: Record<string, number> = counts.reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.sourcePlatform ?? 'UNKNOWN');
    acc[key] = row?._count?._all ?? 0;
    return acc;
  }, {});
  countMap['__all'] = Object.values(countMap).reduce((a: number, b: number) => a + b, 0);

  const exploreUrl = buildExternalSearchUrl(platform, q || '');

  // Compute paging upfront so we can pre-cache images for visible items
  const total = filteredExt.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const end = Math.min(total, start + perPage);
  let pageItems = filteredExt.slice(start, end);
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
  // Pre-cache or resolve images for visible items and standardize to /cache/... paths
  try {
    // For IndiaMART we skip heavy synchronous image enrichment (detail page queries, price tiers, MIC second image fetches)
    // to reduce initial category navigation latency. Raw images (or fallbacks) are displayed; background ingestion
    // will later cache and upgrade images for subsequent navigations via snapshot.
    if (FAST) {
      // Fast path with targeted caching for Alibaba: try to ensure a local /cache path for thumbnails
      pageItems = await Promise.all(pageItems.map(async (it: any) => {
        let img = String(it.image || '');
        let isAli = false;
        try {
          const u = new URL(String(it.url || ''));
          isAli = u.hostname.toLowerCase().includes('alibaba.com');
        } catch {}
        try {
          if (isAli) {
            const hasValid = !!img && !isClearlyNonProductImage(img) && !/^(?:\/seed\/)/.test(img);
            if (!hasValid) {
              // Try to fetch a better image from the product detail quickly (short timeout)
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3000);
              try {
                const { getAlibabaDetailFirstJpg } = await import('@/lib/providers/alibaba');
                const best = await getAlibabaDetailFirstJpg(String(it.url));
                clearTimeout(timeout);
                if (best && !isClearlyNonProductImage(best)) {
                  try {
                    const { cacheExternalImage } = await import('@/lib/imageCache');
                    const { localPath } = await cacheExternalImage(best);
                    if (localPath) img = localPath;
                    else img = best;
                  } catch { img = best; }
                }
              } catch { /* ignore */ }
              // If still missing/seed, attempt server resolver which also caches to /cache
              try {
                if (!img || /^(?:\/seed\/)/.test(img)) {
                  const apiPath = `/api/external/resolve-img?src=${encodeURIComponent(String(it.url || ''))}`;
                  let abs = apiPath;
                  try {
                    const h = headers();
                    const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
                    const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
                    abs = `${proto}://${hostH}${apiPath}`;
                  } catch {
                    const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
                    abs = `${base}${apiPath}`;
                  }
                  const ctrl = new AbortController();
                  const to = setTimeout(() => ctrl.abort(), 3000);
                  const resp = await fetch(abs, { cache: 'no-store', signal: ctrl.signal }).catch(() => null);
                  clearTimeout(to);
                  if (resp?.ok) {
                    const data = await resp.json().catch(() => null);
                    const lp = data?.localPath as string | undefined;
                    if (lp && !isClearlyNonProductImage(lp)) img = lp;
                  }
                }
              } catch { /* ignore */ }
            }
            // If we still have a remote thumbnail URL, try to cache it locally
            if (img && /^https?:\/\//i.test(img) && !isClearlyNonProductImage(img)) {
              try {
                const { cacheExternalImage } = await import('@/lib/imageCache');
                const { localPath } = await cacheExternalImage(img);
                if (localPath) img = localPath;
              } catch {}
            }
          }
        } catch {}
        if (!img) img = '/seed/sleeves.jpg';
        return { ...it, image: img } as any;
      }));
    } else if (platform === 'INDIAMART' || platform === 'INDIAMART_EXPORT') {
      const upgradeLimit = 30; // cap detail page fetches per request to avoid latency spikes
      let used = 0;
      pageItems = await Promise.all(pageItems.map(async (it: any) => {
        let img = String(it.image || '');
        const needsUpgrade = !img || img.startsWith('/seed/');
        if (needsUpgrade && used < upgradeLimit) {
          used++;
          try {
            let best: string | null = null;
            if (platform === 'INDIAMART') {
              const { getIndiaMartDetailMainImage } = await import('@/lib/providers/indiamart');
              best = await getIndiaMartDetailMainImage(it.url);
            } else {
              const { fetchExportProductDetail } = await import('@/lib/providers/indiamartExport');
              const det = await fetchExportProductDetail(it.url).catch(()=>null);
              best = det?.image || null;
            }
            if (best) img = best;
          } catch {}
        }
        // If we obtained a remote image URL, attempt to cache it locally
        if (img && img.startsWith('http')) {
          try {
            const { cacheExternalImage } = await import('@/lib/imageCache');
            const cached = await cacheExternalImage(img, { preferJpgForIndiaMart: true });
            if (cached?.localPath) img = cached.localPath;
          } catch {}
        }
        if (!img) img = '/seed/sleeves.jpg';
        return { ...it, image: img } as any;
      }));
  } else {
    const [{ cacheExternalImage }, { getAlibabaDetailFirstJpg }] = await Promise.all([
      import('@/lib/imageCache'),
      import('@/lib/providers/alibaba'),
    ]);
    const mapped = await Promise.all(pageItems.map(async (it) => {
      let img = String(it.image || '');
      // Always attempt Alibaba detail image extraction for Alibaba URLs - be more aggressive
      if (it.url) {
        try {
          const u = new URL(it.url);
          const host = u.hostname.toLowerCase();
          if (host.includes('alibaba.com')) {
            // Try to get a better image from the detail page
            const best = await getAlibabaDetailFirstJpg(it.url);
            if (best && best !== img) {
              try {
                const cached = await cacheExternalImage(best, { preferJpgForIndiaMart: false });
                if (cached?.localPath && !isBadImageHashFromPath(cached.localPath)) {
                  img = cached.localPath;
                }
              } catch {
                // If caching fails, at least try to use the raw URL
                if (best.startsWith('http')) img = best;
              }
            }
          }
        } catch {}
      }
      // If still no image, try to cache the original listing image
      if (!img && it.image) {
        try {
          const listingImg = String(it.image || '');
          if (!isClearlyNonProductImage(listingImg)) {
            const cached = await cacheExternalImage(listingImg);
            if (cached?.localPath) img = cached.localPath;
          }
        } catch {}
      }
      // Try to enrich with detail price tiers when host is Alibaba or Made-in-China
      let tiers: { min: number; max?: number; priceText: string; label?: string }[] | undefined;
      try {
        if (it.url) {
          const u = new URL(it.url);
          const host = u.hostname.toLowerCase();
          if (host.includes('alibaba.com') || host.includes('made-in-china.com')) {
            // Build absolute URL to ensure Node fetch reaches our own API
            const apiPath = `/api/external/price-tiers?src=${encodeURIComponent(it.url)}`;
            let abs = apiPath;
            try {
              const h = headers();
              const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
              const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
              abs = `${proto}://${hostH}${apiPath}`;
            } catch {
              const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
              abs = `${base}${apiPath}`;
            }
            const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
            if (resp?.ok) {
              const data = await resp.json();
              if (Array.isArray(data?.tiers) && data.tiers.length) tiers = data.tiers as any;
            }
          }
        }
      } catch {}
      // For Made-in-China listings: prefer resolver (second gallery image, usually higher quality) with short timeout, then fall back to listing image cache
      try {
        if (it.url && !img) {
          const u = new URL(it.url);
          const host = u.hostname.toLowerCase();
          const path = u.pathname.toLowerCase();
          const isMicDetail = host.endsWith('made-in-china.com') && (/\/product\//.test(path) || /\/showroom\//.test(path));
          if (isMicDetail) {
            // Try resolver with a short timeout first
            const controller = new AbortController();
            const to = setTimeout(() => controller.abort(), 1500);
            try {
              const resp = await fetch(`/api/external/resolve-img?src=${encodeURIComponent(it.url)}`, { cache: 'no-store', signal: controller.signal });
              clearTimeout(to);
              if (resp?.ok) {
                const data = await resp.json().catch(() => null);
                const lp = data?.localPath;
                if (lp) img = lp;
              }
            } catch {
              clearTimeout(to);
            }
          }
        }
        // If still no image, attempt to cache the provided listing thumbnail (often WEBP on image.made-in-china.com)
        if (!img && it.image) {
          const listingImg = String(it.image || '');
          if (listingImg) {
            try {
              const { localPath } = await cacheExternalImage(listingImg);
              if (localPath) img = localPath;
            } catch {}
          }
        }
      } catch {}
      const enriched: any = { ...it };
      if (tiers) enriched.__tiers = tiers;
      // If we still don't have an image, attempt a final resolver call generically
      if (!img) {
        try {
          if (it.url) {
            const apiPath = `/api/external/resolve-img?src=${encodeURIComponent(it.url)}`;
            let abs = apiPath;
            try {
              const h = headers();
              const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
              const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
              abs = `${proto}://${hostH}${apiPath}`;
            } catch {
              const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
              abs = `${base}${apiPath}`;
            }
            const resp = await fetch(abs, { cache: 'no-store' }).catch(() => null);
            if (resp?.ok) {
              const data = await resp.json().catch(() => null);
              const lp = data?.localPath;
              if (lp) {
                enriched.image = lp;
                return enriched as ExternalListing;
              }
            }
          }
        } catch {}
        return enriched;
      }
      if (img.startsWith('/cache/') || img.startsWith('/seed/')) return { ...it, image: img } as ExternalListing;
      // For any remaining remote URLs, prefer caching to local path for consistency
      try {
        if (/^https?:\/\//i.test(img)) {
          const { localPath } = await cacheExternalImage(img);
          if (localPath) {
            enriched.image = localPath;
            return enriched as ExternalListing;
          }
        }
      } catch {}
      try {
  const { localPath } = await cacheExternalImage(img);
        enriched.image = localPath;
        return enriched as ExternalListing;
      } catch {
        // Fallback: use resolve-img which knows how to extract detail images and cache them (MIC included)
        try {
          const apiPath = `/api/external/resolve-img?src=${encodeURIComponent(it.url)}`;
          let abs = apiPath;
          try {
            const h = headers();
            const hostH = h.get('x-forwarded-host') || h.get('host') || process.env.HOST || 'localhost:3000';
            const proto = h.get('x-forwarded-proto') || (hostH.includes('localhost') || hostH.includes('127.0.0.1') ? 'http' : 'https');
            abs = `${proto}://${hostH}${apiPath}`;
          } catch {
            const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
            abs = `${base}${apiPath}`;
          }
          const resp = await fetch(abs, { cache: 'no-store' });
          if (resp?.ok) {
            const data = await resp.json().catch(() => null);
            const lp = data?.localPath;
            if (lp) {
              enriched.image = lp;
              return enriched as ExternalListing;
            }
          }
        } catch {}
        return enriched;
      }
    }));
    pageItems = mapped;
    }
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

  // As a last-mile improvement, fetch clean titles for a small number of sluggy items
  // (those with .html endings or long numeric IDs) to display a better name on the card.
  const detailTitleMap = new Map<string, string>();
  try {
    const needsClean = pageItems.filter((it) => {
      const raw = String((it as any)?.title || '');
      if (/\.(html?|php|asp|aspx|shtml)\b/i.test(raw)) return true;
      if (/\b\d{8,}\b/.test(raw)) return true;
      return false;
  }).slice(0, 30); // expanded cap so more sluggy items get clean titles on cards
    if (needsClean.length) {
  const { fetchProductDetail } = await import('@/lib/providers/detail');
  const concurrency = 5;
      let idx = 0;
      async function worker() {
        while (idx < needsClean.length) {
          const i = idx++;
          const it = needsClean[i];
          const url = String((it as any)?.url || '');
          if (!url) continue;
          try {
            const det = await fetchProductDetail(url);
            const t = String(det?.title || '').trim();
            if (t && !/\.(html?|php|asp|aspx|shtml)\b/i.test(t) && !/\b\d{8,}\b/.test(t)) {
              detailTitleMap.set(url, t);
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, needsClean.length) }, () => worker()));
    }
  } catch {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Side panel host rendered once at page root */}
      <DetailPanelHost />
      {/* Persist and restore grid density (cols) preference */}
      <GridDensityPreference />
      
      <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-16 py-6 space-y-6">
        {/* Header Section */}
        <RevealSection className="sticky top-[72px] z-20 bg-gradient-to-r from-white via-white to-orange-50/50 backdrop-blur-lg border-b border-orange-200/50 -mx-4 md:-mx-6 lg:-mx-8 xl:-mx-16 px-4 md:px-6 lg:px-8 xl:px-16 py-5 shadow-md">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              MOQ Pools
            </h1>
            <div className="hidden md:block">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-orange-500/30 border-2 border-orange-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Live Marketplace
              </div>
            </div>
          </div>
        </RevealSection>

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

        <SourceTabs counts={countMap} />
        
        {/* Search and Trust Badges */}
        <div className="space-y-4">
          <SearchBar placeholder={`Search ${platformLabel(platform) || 'All platforms'}…`} />
          <TrustBadges size="sm" />
        </div>

      {/* Categories and filters inline, then live listings header */}
      <div className="space-y-4">
        {/* Filters Row */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <CategoryDropdown platform={platform} currentQuery={q} />
              <FiltersBar />
            </div>
            <div className="flex items-center gap-4 ms-auto flex-wrap">
              {(() => {
                const total = filteredExt.length;
                const colSizes = [5, 6, 7, 8];
                const buildColsUrl = (cc: number) => {
                  const usp = new URLSearchParams();
                  if (platform && platform !== 'ALL') usp.set('platform', platform);
                  if (q) usp.set('q', q);
                  if (Number.isFinite(minPriceQ) && minPriceQ > 0) usp.set('minPrice', String(minPriceQ));
                  if (Number.isFinite(maxPriceQ) && maxPriceQ > 0) usp.set('maxPrice', String(maxPriceQ));
                  if (Number.isFinite(minMoqQ) && minMoqQ > 0) usp.set('minMoq', String(minMoqQ));
                  if (Number.isFinite(maxMoqQ) && maxMoqQ > 0) usp.set('maxMoq', String(maxMoqQ));
                  usp.set('per', String(perPage));
                  usp.set('page', String(page));
                  usp.set('cols', String(cc));
                  return `/products?${usp.toString()}`;
                };
                return (
                  <>
                    <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-semibold text-sm border border-orange-200">
                      {formatNumberEN(total)} listings
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 font-medium">Grid:</span>
                      <div className="inline-flex rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {colSizes.map((cc, idx) => {
                          const active = cc === selectedCols;
                          const base = 'px-3 py-1.5 text-xs font-semibold transition-colors';
                          const tone = active 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm' 
                            : 'bg-transparent text-gray-700 hover:bg-gray-200';
                          return (
                            <a key={cc} href={buildColsUrl(cc)} className={`${base} ${tone}`}>
                              {cc}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Listings Header */}
        <div className="flex items-center justify-between">
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
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Showing {start + 1}-{end} of {total} · Page {page} / {totalPages}</div>
            {total === 0 ? (
              <EmptyState title="No listings found" subtitle="Try a different query or relax your filters." actionHref="/products" actionLabel="Reset filters" />
            ) : (
            <RevealSection className={`${gridColsClass} gap-6 mt-3 auto-rows-fr items-stretch`}>
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

                return (
                  <RevealItem key={keyFromListing(it, idx)}>
                    <div className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                      {/* Main clickable block (single anchor) */}
                      <a href={it.url || '#'} target="_blank" rel="noreferrer" className="block flex-1 flex flex-col p-4">
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
                            <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-3 overflow-hidden">
                              <Image
                                src={src}
                                alt={title || it.title || 'Listing image'}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                referrerPolicy="no-referrer"
                                unoptimized={src.startsWith('/cache/')}
                                priority={false}
                              />
                              {/* Platform badge with logo */}
                              {it.url ? (() => {
                                try {
                                  const u = new URL(String(it.url));
                                  const host = u.hostname.toLowerCase();
                                  const code = host.includes('alibaba') ? 'ALIBABA' : host.includes('1688') ? 'C1688' : host.includes('made-in-china') ? 'MADE_IN_CHINA' : host.includes('indiamart') ? 'INDIAMART' : host.replace('www.', '').toUpperCase();
                                  return (
                                    <div className="absolute top-2 left-2">
                                      <PlatformBadge code={code} className="text-xs shadow-lg" />
                                    </div>
                                  );
                                } catch { return null; }
                              })() : null}
                            </div>
                          );
                        })()}
                        <div className="text-xs text-gray-500 truncate mb-1" title={it.storeName || ''}>{it.storeName || ''}</div>
                        <div className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">{title || 'See listing'}</div>
                        {(() => {
                          const primary = it.price && it.price.toString().trim().length ? it.price : '';
                          const tierPrice = tiers.length ? (tiers[0]?.priceText || '') : '';
                          let display = primary || tierPrice;
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
                            <div className="flex items-baseline gap-2 mb-3">
                              <div className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                                {display ? `${display}` : 'See listing'}
                              </div>
                              {soldText ? (
                                <div className="text-xs text-gray-600">{soldText}</div>
                              ) : null}
                            </div>
                          );
                        })()}
                        {(() => {
                          try {
                            // Compute a reasonable MOQ target; default to 100 when unknown or when MOQ <= 1
                            const tierArr = Array.isArray(tiers) ? tiers : [];
                            const sortedTiers = [...tierArr].sort((a: any, b: any) => (a?.min ?? 0) - (b?.min ?? 0));
                            const hasHigherThanOne = sortedTiers.some((t: any) => (t?.min ?? 0) > 1);
                            const visibleTiers = hasHigherThanOne ? sortedTiers.filter((t: any) => (t?.min ?? 0) > 1) : sortedTiers;
                            const mins = visibleTiers.map((t: any) => t?.min).filter((n: any) => typeof n === 'number' && Number.isFinite(n) && n > 1) as number[];
                            const inferredMoqMin = mins.length ? Math.min(...mins) : (typeof qMin === 'number' && qMin > 1 ? qMin : null);
                            const target = inferredMoqMin && inferredMoqMin > 1 ? inferredMoqMin : 100;
                            const current = 0;
                            const percent = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
                            return (
                              <div className="mb-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Pool Progress</span>
                                  <span className="font-bold text-gray-900">{formatNumberEN(current)}/{formatNumberEN(target)}</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 rounded-full" 
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          } catch {
                            // Fallback UI if anything goes wrong
                            return (
                              <div className="mb-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Pool Progress</span>
                                  <span className="font-bold text-gray-900">0/100</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 rounded-full" style={{ width: '0%' }}></div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                        {!tiers.length ? (
                          <div className="mb-2">
                            <Countdown durationMs={5 * 24 * 60 * 60 * 1000} />
                          </div>
                        ) : (
                          <div className="mb-2 h-5" aria-hidden />
                        )}
                      </a>
                      {/* CTA row (sibling to avoid nested links) */}
                      <div className="p-4 pt-0 flex items-center gap-2">
                        <a 
                          href={savedId ? `/pools/${savedId}` : (it.url || '#')} 
                          target={savedId ? undefined : "_blank"} 
                          rel={savedId ? undefined : "noreferrer"} 
                          className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl px-4 py-2.5 text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all hover:scale-105"
                        >
                          Join Pool
                        </a>
                        {it.url && ((it.url as string).includes('alibaba.com') || (it.url as string).includes('made-in-china.com') || (it.url as string).includes('indiamart.com')) ? (
                          <DetailLink url={String(it.url)} title={title} className="px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-sm font-medium text-gray-700 hover:text-orange-600" />
                        ) : (
                          <a href={it.url || '#'} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-sm font-medium text-gray-700 hover:text-orange-600">
                            Details
                          </a>
                        )}
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
                <RevealSection className="flex items-center justify-center gap-2 mt-8">
                  <a 
                    href={buildUrl(Math.max(1, page - 1))} 
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      page <= 1 
                        ? 'pointer-events-none opacity-40 bg-gray-100 text-gray-400' 
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    ← Previous
                  </a>
                  {Array.from({ length: pEnd - pStart + 1 }, (_, i) => pStart + i).map((p) => (
                    <a 
                      key={p} 
                      href={buildUrl(p)} 
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        p === page 
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' 
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                  <a 
                    href={buildUrl(Math.min(totalPages, page + 1))} 
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      page >= totalPages 
                        ? 'pointer-events-none opacity-40 bg-gray-100 text-gray-400' 
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    Next →
                  </a>
                </RevealSection>
              );
            })()}
          </>
        )}
      </div>

      {/* Hidden curated pools section per request to show only live listings */}
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
