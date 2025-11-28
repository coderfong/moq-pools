import { Prisma, SourcePlatform } from '@prisma/client';
import type { ExternalListing, PlatformKey } from './providers/types';
import { prisma } from './prisma';

export type SearchFilters = {
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
  maxMoq?: number;
};

export type SavedListingUpsert = {
  platform: PlatformKey;
  url: string;
  title: string;
  image?: string;
  price?: string;
  currency?: string;
  moq?: string;
  storeName?: string;
  description?: string;
  categories?: string[];
  terms?: string[];
  rating?: string;
  orders?: string;
};

// Small utility helpers for resilient batching
async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function getBatchSize(envVar: string, fallback: number) {
  const v = Number(process.env[envVar]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

async function runBatchWithRetry<T>(
  ops: Prisma.PrismaPromise<T>[],
  options?: { label?: string; maxRetries?: number; initialDelayMs?: number; backoff?: number; fallbackSequential?: boolean; continueOnError?: boolean }
) {
  const {
    label = 'batch',
    maxRetries = 3,
    initialDelayMs = 500,
    backoff = 2,
    fallbackSequential = true,
    continueOnError = false,
  } = options || {};

  // Try as a single transaction first with retries on transient connection closures
  let attempt = 0;
  let delay = initialDelayMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Using optional chaining in case prisma is not fully generated in some scripts
      // @ts-ignore
      return await (prisma?.$transaction?.(ops as any) as Promise<T[]>);
    } catch (err: any) {
      const msg = String(err?.message || '')
        .toLowerCase();
      const code = err?.code;
      const isConnClosed = code === 'P1017' || msg.includes('server has closed the connection') || msg.includes('closed the connection');
      if (isConnClosed && attempt < maxRetries) {
        attempt += 1;
        await sleep(delay);
        delay = Math.min(delay * backoff, 10_000);
        continue;
      }
      // Fallback: run sequentially with per-op retry to make forward progress
      if (fallbackSequential) {
        const out: T[] = [];
        for (const op of ops) {
          let tries = 0;
          let d = 250;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            try {
              // @ts-ignore
              out.push(await op);
              break;
            } catch (e: any) {
              const msg2 = String(e?.message || '').toLowerCase();
              const code2 = e?.code;
              const transient = code2 === 'P1017' || msg2.includes('server has closed the connection') || msg2.includes('closed the connection');
              if (transient && tries < maxRetries) {
                tries += 1;
                await sleep(d);
                d = Math.min(d * 2, 5000);
                continue;
              }
              if (!continueOnError) {
                throw e;
              }
              // Best-effort: log and continue
              // eslint-disable-next-line no-console
              console.warn(`[${label}] op failed after retries:`, e?.code || '', e?.message || e);
              break;
            }
          }
        }
        return out;
      }
      throw err;
    }
  }
}

function parseMinPrice(s?: string): number | null {
  if (!s) return null;
  // Added INR tokens (₹, INR, Rs.)
  const m = s.match(/(US\$|\$|USD|RMB|CNY|¥|￥|₹|INR|Rs\.? )?\s?(\d{1,6}(?:[\.,]\d{1,2})?)/i);
  if (!m) return null;
  const num = Number(m[2].replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

function parseMoq(s?: string): number | null {
  if (!s) return null;
  const str = String(s).trim();
  let m = str.match(/(MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*([\d,]+)/i);
  if (m) {
    const num = Number((m[2] || '').replace(/,/g, ''));
    // Guardrails: discard clearly invalid extremes (e.g., timestamps parsed from text)
    if (!Number.isFinite(num)) return null;
    if (num <= 0 || num > 100000) return null;
    return num;
  }
  m = str.match(/(起订|最小起订量|最低起订量)\s*[:：]?\s*([\d,]+)/);
  if (m) {
    const num = Number((m[2] || '').replace(/,/g, ''));
    if (!Number.isFinite(num)) return null;
    if (num <= 0 || num > 100000) return null;
    return num;
  }
  if (!(/[\$¥￥]|USD|RMB|CNY/.test(str))) {
    // Only infer MOQs from generic numbers when followed by a unit token; avoid plain trailing numbers
    m = str.match(/(^|\b)([\d,]{1,6})(?=\s*(pcs?|pieces?|piece|pairs?|sets?|units?|bags?|lots?)\b)/i);
    if (m) {
      const num = Number((m[2] || '').replace(/,/g, ''));
      if (!Number.isFinite(num)) return null;
      if (num <= 0 || num > 100000) return null;
      return num;
    }
  }
  return null;
}

export function toSourcePlatform(p: PlatformKey): SourcePlatform {
  if (p === 'ALIBABA') return SourcePlatform.ALIBABA;
  if (p === 'C1688') return SourcePlatform.C1688;
  if (p === 'MADE_IN_CHINA') return SourcePlatform.MADE_IN_CHINA;
  if (p === 'INDIAMART') return (SourcePlatform as any).INDIAMART;
  if ((p as any) === 'GLOBAL_SOURCES') return (SourcePlatform as any).GLOBAL_SOURCES ?? SourcePlatform.ALIBABA;
  return SourcePlatform.ALIBABA;
}

export async function upsertListingsRaw(list: ExternalListing[]) {
  if (!list?.length) return;
  const ops: Prisma.PrismaPromise<any>[] = [];
  const p: any = prisma as any;
  if (!p?.externalListingCache?.upsert) return; // prisma client not generated for new models yet
  for (const it of list) {
    const priceMin = parseMinPrice(it.price) ?? undefined;
    const moq = parseMoq(it.moq || `${it.price || ''} ${it.title || ''}`) ?? undefined;
    ops.push(
      p.externalListingCache.upsert({
        where: { url: it.url },
        create: {
          platform: toSourcePlatform(it.platform),
          url: it.url,
          title: it.title || 'Product',
          image: it.image || null as any,
          priceRaw: it.price || null as any,
          currency: it.currency || null as any,
          priceMin,
          priceMax: undefined,
          moqRaw: it.moq || null as any,
          moq: moq as any,
          ordersRaw: it.orders || null as any,
          ratingRaw: it.rating || null as any,
          storeName: it.storeName || null as any,
          description: it.description || null as any,
        },
        update: {
          title: it.title || undefined,
          image: (it.image || undefined) as any,
          priceRaw: (it.price || undefined) as any,
          currency: (it.currency || undefined) as any,
          priceMin,
          moqRaw: (it.moq || undefined) as any,
          moq: (moq as any),
          ordersRaw: (it.orders || undefined) as any,
          ratingRaw: (it.rating || undefined) as any,
          storeName: (it.storeName || undefined) as any,
          description: (it.description || undefined) as any,
        }
      })
    );
  }
  // Run in small batches with retry to avoid connection closures/timeouts
  const batchSize = getBatchSize('EXTERNAL_LISTING_UPSERT_BATCH', 20);
  for (let i = 0; i < ops.length; i += batchSize) {
    const slice = ops.slice(i, i + batchSize);
    await runBatchWithRetry(slice, { label: 'externalListingCache', maxRetries: 3, initialDelayMs: 400, backoff: 2 });
  }
}

export async function saveSearchSnapshot(params: {
  q: string;
  platform: string; // 'ALL' or specific
  filters: SearchFilters;
  orderedUrls: string[]; // deduped and sorted list of listing urls
}) {
  const { q, platform, filters, orderedUrls } = params;
  const p: any = prisma as any;
  if (!p?.externalListingCache?.findMany || !p?.listingSearch?.create) return null;
  // Resolve listing IDs for urls
  const listings = await p.externalListingCache.findMany({
    where: { url: { in: orderedUrls } },
    select: { id: true, url: true },
  });
  const map = new Map<string, string>((listings as Array<{id: string; url: string}>).map((l) => [l.url, l.id] as const));
  const itemsData = orderedUrls
    .map((url, idx) => ({ url, idx }))
    .filter(x => map.has(x.url))
    .map(x => ({ position: x.idx, listingId: map.get(x.url)! }));

  const search = await p.listingSearch.create({
    data: {
      q,
      platform,
      filtersJson: JSON.stringify(filters || {}),
      total: orderedUrls.length,
      items: { createMany: { data: itemsData } },
    }
  });
  return search.id as string;
}

export async function getCachedSearch(params: {
  q: string;
  platform: string;
  filters: SearchFilters;
  offset: number;
  limit: number;
  maxAgeMinutes?: number; // default 60
}) {
  const { q, platform, filters, offset, limit, maxAgeMinutes = 60 } = params;
  const since = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const p: any = prisma as any;
  if (!p?.listingSearch?.findFirst || !p?.listingSearchItem?.findMany) return null;
    const row = await p.listingSearch.findFirst({
    where: {
      q,
      platform,
      createdAt: { gte: since },
          // naive filter-match by string equality
          filtersJson: JSON.stringify(filters || {})
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, total: true },
  });
  if (!row) return null;
  const items = await p.listingSearchItem.findMany({
    where: { searchId: row.id, position: { gte: offset, lt: offset + limit } },
    orderBy: { position: 'asc' },
    include: { listing: true },
  });
  const out: ExternalListing[] = (items as Array<any>).map((i: any) => ({
    platform: (i.listing.platform as any as PlatformKey) ?? 'ALIBABA',
    title: i.listing.title,
    image: i.listing.image || '',
    url: i.listing.url,
    price: i.listing.priceRaw || '',
    currency: i.listing.currency || undefined,
    moq: i.listing.moqRaw || undefined,
    orders: i.listing.ordersRaw || undefined,
    rating: i.listing.ratingRaw || undefined,
    storeName: i.listing.storeName || undefined,
    description: i.listing.description || undefined,
  }));
  return { items: out, total: row.total };
}

export async function getLatestSearchSnapshot(params: {
  q: string;
  platform: string;
  filters: SearchFilters;
  offset: number;
  limit: number;
}) {
  const { q, platform, filters, offset, limit } = params;
  const p: any = prisma as any;
  if (!p?.listingSearch?.findFirst || !p?.listingSearchItem?.findMany) return null;
  const row = await p.listingSearch.findFirst({
    where: {
      q,
      platform,
      filtersJson: JSON.stringify(filters || {}),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, total: true },
  });
  if (!row) return null;
  const items = await p.listingSearchItem.findMany({
    where: { searchId: row.id, position: { gte: offset, lt: offset + limit } },
    orderBy: { position: 'asc' },
    include: { listing: true },
  });
  const out: ExternalListing[] = (items as Array<any>).map((i: any) => ({
    platform: (i.listing.platform as any as PlatformKey) ?? 'ALIBABA',
    title: i.listing.title,
    image: i.listing.image || '',
    url: i.listing.url,
    price: i.listing.priceRaw || '',
    currency: i.listing.currency || undefined,
    moq: i.listing.moqRaw || undefined,
    orders: i.listing.ordersRaw || undefined,
    rating: i.listing.ratingRaw || undefined,
    storeName: i.listing.storeName || undefined,
    description: i.listing.description || undefined,
  }));
  return { items: out, total: row.total };
}

// SavedListing helpers (your own catalogue)
export async function upsertSavedListings(list: SavedListingUpsert[]) {
  if (!list?.length) return;
  const p: any = prisma as any;
  if (!p?.savedListing?.upsert) return; // Not migrated yet
  const ops: any[] = [];
  for (const it of list) {
    const priceMin = parseMinPrice(it.price) ?? undefined;
    const moq = parseMoq(it.moq || `${it.price || ''} ${it.title || ''}`) ?? undefined;
    ops.push(p.savedListing.upsert({
      where: { url: it.url },
      create: {
        platform: toSourcePlatform(it.platform),
        url: it.url,
        title: it.title,
        image: it.image || null,
        priceRaw: it.price || null,
        priceMin,
        currency: it.currency || null,
        moqRaw: it.moq || null,
        moq: moq as any,
        storeName: it.storeName || null,
        description: it.description || null,
        categories: (it.categories || []) as any,
        terms: (it.terms || []) as any,
        ratingRaw: it.rating || null,
        ordersRaw: it.orders || null,
      },
      update: {
        title: it.title || undefined,
        image: it.image || undefined,
        priceRaw: it.price || undefined,
        priceMin,
        currency: it.currency || undefined,
        moqRaw: it.moq || undefined,
        moq: (moq as any),
        storeName: it.storeName || undefined,
        description: it.description || undefined,
        categories: (it.categories || undefined) as any,
        terms: (it.terms || undefined) as any,
        ratingRaw: it.rating || undefined,
        ordersRaw: it.orders || undefined,
      }
    }));
  }
  const batchSize = getBatchSize('SAVED_LISTING_UPSERT_BATCH', 20);
  for (let i = 0; i < ops.length; i += batchSize) {
    const slice = ops.slice(i, i + batchSize);
    await runBatchWithRetry(slice, { label: 'savedListing', maxRetries: 4, initialDelayMs: 500, backoff: 2, continueOnError: true });
  }
}

export async function querySavedListings(params: {
  q?: string;
  platform?: string; // 'ALL' or specific
  categories?: string[];
  offset?: number;
  limit?: number;
}): Promise<ExternalListing[]> {
  const { q, platform = 'ALL', categories = [], offset = 0, limit = 999999 } = params;
  console.log('[querySavedListings] Called with:', { q, platform, categories, offset, limit });
  const p: any = prisma as any;
  if (!p?.savedListing?.findMany) {
    console.log('[querySavedListings] Prisma savedListing not available');
    return [];
  }
  const where: any = {};
  if (platform !== 'ALL') where.platform = platform;
  const ors: any[] = [];
  if (q) {
    const qLower = q.toLowerCase();
    ors.push({ title: { contains: q, mode: 'insensitive' } });
    ors.push({ description: { contains: q, mode: 'insensitive' } });
    // Exact terms match (case-sensitive in array) for original
    ors.push({ terms: { hasSome: [q] } });
    // Lower-case variant for when stored terms were normalized differently
    if (qLower !== q) {
      ors.push({ terms: { hasSome: [qLower] } });
    }
  }
  if (categories.length) {
    ors.push({ categories: { hasSome: categories } });
  }
  if (ors.length) where.OR = ors;
  console.log('[querySavedListings] Query where:', JSON.stringify(where));
  const rows = await p.savedListing.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip: offset,
    take: limit,
  });
  console.log('[querySavedListings] Found rows:', rows.length);
  return (rows as Array<any>).map((r) => ({
    platform: (r.platform as any),
    title: r.title,
    image: r.image || '',
    url: r.url,
    price: r.priceRaw || '',
    currency: r.currency || undefined,
    moq: r.moqRaw || undefined,
    storeName: r.storeName || undefined,
    description: r.description || undefined,
    rating: r.ratingRaw || undefined,
    orders: r.ordersRaw || undefined,
    // Non-standard field to help UI link to /pools/[id]
    savedId: r.id,
  }));
}
