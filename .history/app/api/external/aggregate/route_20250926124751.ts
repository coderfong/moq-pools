import { NextResponse } from 'next/server';
import { fetchAliExpress } from '@/lib/providers/aliexpress';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchC1688 } from '@/lib/providers/c1688';
import type { ExternalListing } from '@/lib/providers/types';
import { sharedCache } from '@/lib/cache';

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
  const m = s.match(/(US\$|\$|USD|RMB|CNY|¥|￥)?\s?(\d{1,6}(?:[\.,]\d{1,2})?)/);
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
  const headless = /^(0|false|no)$/i.test(String(searchParams.get('headless') || '1')) ? false : true;
  const debug = /^(1|true|yes)$/i.test(String(searchParams.get('debug') || '0'));
  const nocache = /^(1|true|yes)$/i.test(String(searchParams.get('nocache') || '0'));

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
      v: 2,
      route: 'aggregate',
      q,
      platform,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      minMoq: Number.isFinite(minMoq) ? minMoq : undefined,
      maxMoq: Number.isFinite(maxMoq) ? maxMoq : undefined,
      headless: headless || undefined,
    });

  let mergedFiltered: ExternalListing[] | undefined = nocache ? undefined : (sharedCache.get(cacheKey) as ExternalListing[] | undefined);

    if (!mergedFiltered) {
      let items: ExternalListing[] = [];
      if (platform === 'ALL') {
        // Fetch a generous amount to cover first few pages, then cache.
        const target = Math.max(120, offset + limit);
        // In headless mode, fetch more from each provider to offset client-side rendering and dedupe
        const per = headless ? Math.min(220, Math.max(80, Math.ceil(target))) : Math.min(240, Math.max(60, Math.ceil(target / 3)));
        const [a, e, c] = await Promise.all([
          withTimeout(fetchAlibaba(q, per, { headless }), 20000, 'alibaba').catch((err) => { console.warn('agg alibaba', String(err)); return []; }),
          withTimeout(fetchAliExpress(q, per, { headless }), 20000, 'aliexpress').catch((err) => { console.warn('agg aliexpress', String(err)); return []; }),
          withTimeout(fetchC1688(q, per, { headless }), 20000, 'c1688').catch((err) => { console.warn('agg c1688', String(err)); return []; }),
        ]);
        items = [...(a || []), ...(e || []), ...(c || [])];
  } else if (platform === 'ALIBABA') items = await withTimeout(fetchAlibaba(q, Math.min(800, offset + limit), { headless }), 20000, 'alibaba').catch(() => []);
  else if (platform === 'ALIEXPRESS') items = await withTimeout(fetchAliExpress(q, Math.min(800, offset + limit), { headless }), 20000, 'aliexpress').catch(() => []);
  else if (platform === 'C1688') items = await withTimeout(fetchC1688(q, Math.min(800, offset + limit), { headless }), 20000, 'c1688').catch(() => []);
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
        // Enforce baseline MOQ >= 2 unless caller specifies higher minMoq
        const effMinMoq = Math.max(2, Number.isFinite(minMoq) && minMoq > 0 ? minMoq : 0);
        if (m != null && m < effMinMoq) return false;
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
