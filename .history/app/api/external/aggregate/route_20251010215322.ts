import { NextResponse } from 'next/server';
// AliExpress removed
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchC1688 } from '@/lib/providers/c1688';
import { fetchMadeInChina } from '@/lib/providers/madeinchina';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import type { ExternalListing } from '@/lib/providers/types';
import { sharedCache } from '@/lib/cache';
import { getCachedSearch, saveSearchSnapshot, upsertListingsRaw } from '@/lib/listingStore';

export const dynamic = 'force-dynamic';

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return u;
  }
}

function parseMinPrice(s?: string): number | null {
  if (!s) return null;
  // Added support for INR symbols: ₹, Rs, INR
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
    return Number.isFinite(num) ? num : null;
  }
  m = str.match(/(起订|最小起订量|最低起订量)\s*[:：]?\s*([\d,]+)/);
  if (m) {
    const num = Number((m[2] || '').replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }
  if (!(/[\$¥￥]|USD|RMB|CNY/.test(str))) {
    m = str.match(/(^|\b)([\d,]{1,6})(?=\s*(pcs?|pieces?|piece|pairs?|sets?|units?|bags?|lots?)\b|$)/i);
    if (m) {
      const num = Number((m[2] || '').replace(/,/g, ''));
      return Number.isFinite(num) ? num : null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const platform = (searchParams.get('platform') || 'ALL').toUpperCase();
  // Clamp offset/limit to reasonable bounds
  const offset = Math.max(0, Number.isFinite(Number(searchParams.get('offset'))) ? Number(searchParams.get('offset')) : 0);
  // Default to 50 so callers that omit limit still get a fuller page
  const limitRaw = Number.isFinite(Number(searchParams.get('limit'))) ? Number(searchParams.get('limit')) : 50;
  const limit = Math.min(200, Math.max(1, limitRaw));
  const minPrice = Number(searchParams.get('minPrice') || '');
  const maxPrice = Number(searchParams.get('maxPrice') || '');
  const minMoq = Number(searchParams.get('minMoq') || '');
  const maxMoq = Number(searchParams.get('maxMoq') || '');
  // Default to headless=true unless explicitly disabled
  // Default headless to false for faster, lighter fetches; client can opt-in with headless=1
  const headless = /^(1|true|yes)$/i.test(String(searchParams.get('headless') || '0')) ? true : false;
  const forceHeadless = /^(1|true|yes)$/i.test(String(searchParams.get('forceHeadless') || '0')) ? true : false;
  const debug = /^(1|true|yes)$/i.test(String(searchParams.get('debug') || '0')) ? true : false;
  const nocache = /^(1|true|yes)$/i.test(String(searchParams.get('nocache') || '0'));
  // Prefetch mode: return a small fast batch (no headless, reduced per-provider limits) and skip snapshot persistence
  const prefetch = /^(1|true|yes)$/i.test(String(searchParams.get('prefetch') || '0'));
  // When prefetch & IndiaMART single-platform, apply smaller timeout

  // Allow empty queries; providers may return general or trending listings.

  function withTimeout<T>(p: Promise<T>, ms = 10000, label = 'op'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
      p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
    });
  }

  try {
    // Build a cache key that ignores offset/limit, since we slice after fetch
    const cacheKey = JSON.stringify({
      v: 3,
      route: 'aggregate',
      q,
      platform,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      minMoq: Number.isFinite(minMoq) ? minMoq : undefined,
      maxMoq: Number.isFinite(maxMoq) ? maxMoq : undefined,
      headless: headless || undefined,
      prefetch: prefetch || undefined,
      debug: debug || undefined,
    });

  let mergedFiltered: ExternalListing[] | undefined = nocache ? undefined : (sharedCache.get(cacheKey) as ExternalListing[] | undefined);

    if (!mergedFiltered) {
      // 1) Try DB snapshot cache first for fast paging
      const dbHit = await getCachedSearch({
        q,
        platform,
        filters: {
          minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
          maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
          minMoq: Number.isFinite(minMoq) ? minMoq : undefined,
          maxMoq: Number.isFinite(maxMoq) ? maxMoq : undefined,
        },
        offset,
        limit,
        maxAgeMinutes: 180, // 3h snapshot validity
      }).catch(() => null);

      if (dbHit && (dbHit.items?.length || 0) > 0) {
        // Short-circuit with DB result for this page
        return NextResponse.json({ items: dbHit.items, total: dbHit.total }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
      }

      let items: ExternalListing[] = [];
  if (platform === 'ALL') {
        // Fetch a generous amount to cover first few pages, then cache.
        const target = prefetch ? Math.max(30, Math.min(90, offset + limit)) : Math.max(120, offset + limit);
        // In headless mode, fetch more from each provider; in prefetch mode keep numbers small for low latency
        const per = prefetch ? Math.min(60, Math.max(20, Math.ceil(target / 4))) : headless ? Math.min(220, Math.max(80, Math.ceil(target))) : Math.min(240, Math.max(60, Math.ceil(target / 3)));
        const [a, c, m, i] = await Promise.all([
          withTimeout(fetchAlibaba(q, per, { headless: !prefetch && headless }), prefetch ? 12000 : 20000, 'alibaba').catch((err) => { if(debug) console.warn('agg alibaba', String(err)); return []; }),
          withTimeout(fetchC1688(q, per, { headless: !prefetch && headless }), prefetch ? 12000 : 20000, 'c1688').catch((err) => { if(debug) console.warn('agg c1688', String(err)); return []; }),
          withTimeout(fetchMadeInChina(q, per, { headless: !prefetch && headless, upgradeImages: false }), prefetch ? 12000 : 20000, 'madeinchina').catch((err) => { if(debug) console.warn('agg mic', String(err)); return []; }),
          // Enable cacheImages + upgradeImages for IndiaMART so thumbnails are resolved to /cache paths (even when missing initially)
          withTimeout(fetchIndiaMart(q, per, { headless: !prefetch && headless, forceHeadless, debug, cacheImages: true, upgradeImages: true }), prefetch ? 12000 : 20000, 'indiamart').catch((err) => { if(debug) console.warn('agg indiamart', String(err)); return []; }),
        ]);
        items = [...(a || []), ...(c || []), ...(m || []), ...(i || [])];
      } else if (platform === 'ALIBABA') items = await withTimeout(fetchAlibaba(q, Math.min(prefetch ? 120 : 800, offset + limit), { headless: !prefetch && headless }), prefetch ? 12000 : 20000, 'alibaba').catch(() => []);
      else if (platform === 'C1688') items = await withTimeout(fetchC1688(q, Math.min(prefetch ? 120 : 800, offset + limit), { headless: !prefetch && headless }), prefetch ? 12000 : 20000, 'c1688').catch(() => []);
      else if (platform === 'MADE_IN_CHINA') items = await withTimeout(fetchMadeInChina(q, Math.min(prefetch ? 120 : 800, offset + limit), { headless: !prefetch && headless, upgradeImages: false }), prefetch ? 12000 : 20000, 'madeinchina').catch(() => []);
      else if (platform === 'INDIAMART') {
        const fastLimit = prefetch ? Math.min(60, Math.max(30, limit)) : Math.min(800, offset + limit);
        items = await withTimeout(fetchIndiaMart(q, fastLimit, { headless: !prefetch && headless, forceHeadless, debug, cacheImages: true, upgradeImages: !prefetch }), prefetch ? 10000 : 20000, 'indiamart').catch(() => []);
      }
      else return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

      // Deduplicate by normalized URL
      const seen = new Set<string>();
      const uniq: ExternalListing[] = [];
      for (const it of items) {
        const key = normalizeUrl(it.url || '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniq.push(it);
      }

      // Optional filters
      const filtered = uniq.filter((raw) => {
        const p = parseMinPrice(raw.price);
        const m0 = parseMoq(raw.moq);
        const m = m0 ?? parseMoq(`${raw.price || ''} ${raw.title || ''} ${raw['description'] || ''}`);
        // Do not enforce a hidden baseline MOQ; only apply when caller specifies minMoq
        const effMinMoq = Number.isFinite(minMoq) && minMoq > 0 ? (minMoq as number) : 0;
        // Allow 1688 items even if MOQ couldn't be parsed; users can filter explicitly if desired
        if (m != null && effMinMoq > 0 && m < effMinMoq) return false;
        if (Number.isFinite(minPrice) && minPrice > 0 && (p == null || p < minPrice)) return false;
        if (Number.isFinite(maxPrice) && maxPrice > 0 && (p != null && p > maxPrice)) return false;
        if (Number.isFinite(minMoq) && minMoq > 0 && (m == null || m < minMoq)) return false;
        if (Number.isFinite(maxMoq) && maxMoq > 0 && (m != null && m > maxMoq)) return false;
        return true;
      });

      // Stable sort to avoid item jitter across pages
      mergedFiltered = filtered.sort((a, b) => {
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

      // 2) Persist listings and search snapshot for future fast pages (best-effort)
      if (!prefetch) {
        // Persist in background to avoid blocking response; fire-and-forget
        (async () => {
          try {
            await upsertListingsRaw(mergedFiltered!);
            const orderedUrls = mergedFiltered!.map((x) => x.url);
            await saveSearchSnapshot({
              q,
              platform,
              filters: {
                minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
                maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
                minMoq: Number.isFinite(minMoq) ? minMoq : undefined,
                maxMoq: Number.isFinite(maxMoq) ? maxMoq : undefined,
              },
              orderedUrls,
            });
          } catch (e) {
            console.warn('listing snapshot save failed (bg)', e);
          }
        })();
      }

      // Cache for 5 minutes (adjust as needed). Respect nocache to skip storing.
      if (!nocache) sharedCache.set(cacheKey, mergedFiltered, 5 * 60 * 1000);
    }

    const arr = mergedFiltered || [];
    const total = arr.length;
    const page = arr.slice(offset, offset + limit);
    const body: any = { items: page, total };
    if (debug) {
      const platformCounts = arr.reduce((acc: Record<string, number>, it) => {
        const k = String(it.platform || 'UNKNOWN');
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      body.meta = {
        headless,
        prefetch,
        platformCounts,
        cacheHit: !!sharedCache.get(JSON.stringify({
          v: 1,
          route: 'aggregate',
          q,
          platform,
          minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
          maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
          minMoq: Number.isFinite(minMoq) ? minMoq : undefined,
          maxMoq: Number.isFinite(maxMoq) ? maxMoq : undefined,
          headless: headless || undefined,
        }))
      };
    }
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
