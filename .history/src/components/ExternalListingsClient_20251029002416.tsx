'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExternalListing, PlatformKey } from '@/lib/providers/types';
import { resolveFallbackImage, isBadImageHashFromPath } from '@/lib/imageFallbacks';
import { hasGoodImage, canonicalizeUrl, normalizeTitle, isSeedOrBad } from '@/lib/imageUtils';
import type { PriceTier } from './TieredPriceProgress';
import { computeDisplayTitle } from '@/lib/title';

type Props = {
  platform: string; // 'ALL' | PlatformKey
  q: string;
  initialItems: ExternalListing[];
  batch?: number; // new items target per step (approx)
  max?: number;   // max total items to try to display
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
  maxMoq?: number;
};

// computeDisplayTitle imported from shared util

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

// Heuristic parser for tiered price text often found on Alibaba/1688 results.
// Supports patterns like:
//   "50 - 499 pieces US$8.89 500 - 999 pieces US$8.28 1000 - 999999 pieces US$7.67 >= 1000000 pieces US$6.95"
//   "≥ 1000 US$6.95"
//   "100-199 $10 | 200-499 $9 | ≥500 $8"
function parsePriceTiers(raw?: string): PriceTier[] {
  const s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const tiers: PriceTier[] = [];
  // Regex segments: [min - max] units price OR [≥ min] units price
  const re = /(?:(?:≥|>=)\s*(\d{1,7})|(\d{1,7})\s*[-~–]\s*(\d{1,7}))\s*(?:pcs?|pieces?|units?|bags?|sets?)?\b[^$¥￥USDCNYRMB]*((?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const gteMin = m[1];
    const minStr = m[2];
    const maxStr = m[3];
    const priceText = m[4];
    if (gteMin) {
      const min = Number(gteMin.replace(/,/g, ''));
      if (Number.isFinite(min)) tiers.push({ min, max: undefined, priceText, label: `≥${min}` });
      continue;
    }
    const min = Number((minStr || '').replace(/,/g, ''));
    const max = Number((maxStr || '').replace(/,/g, ''));
    if (Number.isFinite(min)) {
      tiers.push({ min, max: Number.isFinite(max) ? max : undefined, priceText, label: Number.isFinite(max) ? `${min}-${max}` : `≥${min}` });
    }
  }
  // If no matches, try a compact bar-delimited format like "100-199 $10 | 200-499 $9 | ≥500 $8"
  if (!tiers.length && /\|/.test(s)) {
    s.split('|').forEach(part => {
      const pm = part.match(/(?:(?:≥|>=)\s*(\d{1,7})|(\d{1,7})\s*[-~–]\s*(\d{1,7})).*?((?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)/i);
      if (pm) {
        const g = pm;
        const gte = g[1];
        const minStr2 = g[2];
        const maxStr2 = g[3];
        const priceText2 = g[4];
        if (gte) {
          const min = Number(gte.replace(/,/g, ''));
          if (Number.isFinite(min)) tiers.push({ min, max: undefined, priceText: priceText2, label: `≥${min}` });
        } else if (minStr2) {
          const min = Number(minStr2.replace(/,/g, ''));
          const max = Number((maxStr2 || '').replace(/,/g, ''));
          if (Number.isFinite(min)) tiers.push({ min, max: Number.isFinite(max) ? max : undefined, priceText: priceText2, label: Number.isFinite(max) ? `${min}-${max}` : `≥${min}` });
        }
      }
    });
  }
  // Normalize order and dedupe by min
  const sorted = Array.from(new Map(tiers.map(t => [t.min, t] as const)).values()).sort((a, b) => a.min - b.min);
  return sorted;
}

// More robust extractor adapted from SSR, scans lines and pairs qty lines with following price lines
function extractQtyTiersFromText(text: string): PriceTier[] {
  const lines = text
    .split(/\n|\r|\t/g)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const qtyRangeRe = /^(\d{1,6})\s*[-~–]\s*(\d{1,6})\s*(pcs|pieces|pairs|sets|units|bags|lots)?\b/i;
  const qtyGteRe = /^(?:≥|>=)\s*(\d{1,6})\s*(pcs|pieces|pairs|sets|units|bags|lots)?\b/i;
  const priceReGlobal = /(US\$|\$|USD|RMB|CNY|¥|￥)\s*(\d{1,6}(?:[\.,]\d{1,2})?)/g;
  const unitFromAll = text.match(/\b(pcs|pieces|pairs|sets|units|bags|lots)\b/i)?.[1]?.toLowerCase();
  const out: PriceTier[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let mRange = line.match(qtyRangeRe);
    let mGte = !mRange ? line.match(qtyGteRe) : null;
    if (mRange || mGte) {
      const min = mRange ? Number(mRange[1]) : Number(mGte![1]);
      const max = mRange ? Number(mRange[2]) : undefined;
      const unit = (mRange?.[3] || mGte?.[2] || unitFromAll || '').toLowerCase() || undefined;
      // Collect 1-2 price values from same or subsequent lines until next qty
      let priceA: string | undefined;
      let priceB: string | undefined;
      const sameLine: string[] = [];
      let pm: RegExpExecArray | null;
      priceReGlobal.lastIndex = 0;
      while ((pm = priceReGlobal.exec(line)) != null) sameLine.push(pm[2].replace(/,/g, ''));
      if (sameLine[0]) priceA = sameLine[0];
      if (sameLine[1]) priceB = sameLine[1];
      if (!priceA || !priceB) {
        let look = 1; const collected: string[] = [];
        while (look <= 2 && (i + look) < lines.length) {
          const ln = lines[i + look];
          if (qtyRangeRe.test(ln) || qtyGteRe.test(ln)) break;
          priceReGlobal.lastIndex = 0;
          while ((pm = priceReGlobal.exec(ln)) != null) collected.push(pm[2].replace(/,/g, ''));
          look++;
        }
        if (!priceA && collected[0]) priceA = collected[0];
        if (!priceB && collected[1]) priceB = collected[1];
      }
      const priceText = priceA ? `US$${priceA}` : '';
      if (Number.isFinite(min)) out.push({ min, max: Number.isFinite(max as any) ? (max as number) : undefined, priceText, label: (Number.isFinite(max as any) ? `${min}-${max}` : `≥${min}`) });
    }
  }
  // Dedupe by min and sort
  const map = new Map<number, PriceTier>();
  for (const t of out) if (!map.has(t.min)) map.set(t.min, t);
  return Array.from(map.values()).sort((a, b) => a.min - b.min);
}

function inferUpperBoundFromText(text: string, qMin: number | null): number | undefined {
  if (!text || !qMin || qMin <= 0) return undefined;
  const s = String(text);
  // Find numbers followed by units (avoid currency)
  const re = /(\d{1,9})(?=\s*(pcs?|pieces?|pairs?|sets?|units?|bags?|lots?)\b)/gi;
  let m: RegExpExecArray | null;
  let best: number | undefined;
  while ((m = re.exec(s))) {
    const n = Number((m[1] || '').replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    if (n > (qMin as number)) best = best ? Math.max(best, n) : n;
  }
  return best;
}

export default function ExternalListingsClient({ platform, q, initialItems, batch = 100, max = 1200, minPrice, maxPrice, minMoq, maxMoq }: Props) {
  const [items, setItems] = useState<ExternalListing[]>(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Track offset-based pagination when using the aggregate endpoint
  const [offset, setOffset] = useState(items.length);
  // Map from original external image URL -> resolved local /cache path
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  // Map of listing URL -> detail-derived price tiers (fetched on demand for Alibaba detail pages)
  const [detailTiers, setDetailTiers] = useState<Record<string, PriceTier[]>>({});

  // Treat missing platform as the All tab
  const isAllTab = !platform || String(platform).toUpperCase() === 'ALL';

  // Sleeve detection that also catches Next optimizer wrapped URLs
  const isSeedish = (u?: string | null) => {
    if (!u) return false;
    try {
      const dec = decodeURIComponent(u);
      return /(?:^|\/)seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(dec);
    } catch {
      return /(?:^|\/)seed\/|sleeves\.(?:jpg|jpeg|png|webp)/i.test(u);
    }
  };

  // One place to pick the image we'll actually render (resolved -> raw -> fallback)
  const bestImgFor = (row: ExternalListing): string | undefined => {
    const urlKey = String(row.url || '');
    const rawImg = String(row.image || '');
    // Prefer a resolved image mapped by listing URL, then by the original image URL (direct resolution path)
    const resolvedByUrl = imgMap?.[urlKey];
    const resolvedByImg = rawImg ? imgMap?.[rawImg] : undefined;
    const title = computeDisplayTitle(row);
    // Do not consider fallback on the All tab to avoid rendering sleeve/1x1 placeholders
    const fallback = isAllTab ? undefined : resolveFallbackImage(rawImg, row.title || title, row.description || '');
    const candidates = [resolvedByUrl, resolvedByImg, rawImg, fallback].filter(Boolean) as string[];
    return candidates.find((u) => !!u && !isSeedish(u) && !isSeedOrBad(u));
  };

  const filters = useMemo(() => ({ minPrice, maxPrice, minMoq, maxMoq }), [minPrice, maxPrice, minMoq, maxMoq]);

  const applyFilter = (list: ExternalListing[]) => {
    return list.filter((raw) => {
      const p = parseMinPrice(raw.price);
      const m0 = parseMoq(raw.moq);
      const m = m0 ?? parseMoq(`${raw.price || ''} ${raw.title || ''} ${raw['description'] || ''}`);
      const effMinMoq = Math.max(2, Number.isFinite(filters.minMoq as number) && (filters.minMoq as number) > 0 ? (filters.minMoq as number) : 0);
      if (m != null && m < effMinMoq) return false;
      if (Number.isFinite(filters.minPrice as number) && (filters.minPrice as number) > 0 && (p == null || p < (filters.minPrice as number))) return false;
      if (Number.isFinite(filters.maxPrice as number) && (filters.maxPrice as number) > 0 && (p != null && p > (filters.maxPrice as number))) return false;
      if (Number.isFinite(filters.minMoq as number) && (filters.minMoq as number) > 0 && (m == null || m < (filters.minMoq as number))) return false;
      if (Number.isFinite(filters.maxMoq as number) && (filters.maxMoq as number) > 0 && (m != null && m > (filters.maxMoq as number))) return false;
      return true;
    });
  };

  const dedupMerge = (prev: ExternalListing[], next: ExternalListing[]) => {
    const seen = new Set(prev.map(x => normalizeUrl(x.url)));
    const out = [...prev];
    for (const it of next) {
      const key = normalizeUrl(it.url || '')
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  };

  // Render-time de-dupe and image-quality preference for IndiaMART
  const displayItems = useMemo(() => {
    const list = items || [];
    const bestByUrlKey = new Map<string, ExternalListing>();
    const isIndiaMart = (l: ExternalListing) => String(l.platform).toUpperCase() === 'INDIAMART' || (() => { try { return new URL(l.url).hostname.toLowerCase().includes('indiamart.com'); } catch { return false; } })();

    const score = (x: ExternalListing) => {
      const urlKey = String(x.url || '');
      const rawImg = String(x.image || '');
      const derivedByUrl = imgMap[urlKey];
      const derivedByImg = rawImg ? imgMap[rawImg] : undefined;
      const primary = derivedByUrl && !isBadImageHashFromPath(derivedByUrl) ? derivedByUrl : undefined;
      const secondary = !primary && derivedByImg && !isBadImageHashFromPath(derivedByImg) ? derivedByImg : undefined;
      // On All tab, don't let fallback influence "has good image" score
      const chosen = primary || secondary || (!isAllTab ? (resolveFallbackImage(rawImg, x.title || '', x.description || '') || rawImg) : rawImg);
      const hasGood = hasGoodImage(chosen);
      // Favor good image, then longer description/title as a weak tiebreaker
      return (hasGood ? 1_000_000 : 0) + ((x.description?.length || 0) / 1000) + ((x.title?.length || 0) / 3000);
    };

    for (const row of list) {
      if (!isIndiaMart(row)) {
        bestByUrlKey.set(`OTHER|${row.url}`, row);
        continue;
      }
      const key = `IM|${canonicalizeUrl(row.url)}`;
      const prev = bestByUrlKey.get(key);
      if (!prev) { bestByUrlKey.set(key, row); continue; }
      if (score(row) > score(prev)) bestByUrlKey.set(key, row);
    }

    // Stage 1 result: per canonical URL
    const stage1Others = list.filter(l => !isIndiaMart(l));
    const stage1IMs = Array.from(bestByUrlKey.entries()).filter(([k]) => k.startsWith('IM|')).map(([,v]) => v);

    // Stage 2: collapse IndiaMART by normalized title (handles distinct URLs with same product)
  const byTitle = new Map<string, ExternalListing[]>();
    for (const r of stage1IMs) {
      const key = `IMTTL|${normalizeTitle(r.title)}`;
      const arr = byTitle.get(key) ?? [];
      arr.push(r); byTitle.set(key, arr);
    }
    const titleWinners: ExternalListing[] = [];
    for (const arr of byTitle.values()) {
      if (arr.length === 1) { titleWinners.push(arr[0]); continue; }
      titleWinners.push([...arr].sort((a,b) => score(b) - score(a))[0]);
    }
    const merged = [...stage1Others, ...titleWinners];
    // For the ALL tab, remove sleeve listings entirely
    // Do not filter here; apply a last-mile filter right before rendering to avoid any drift
    // Otherwise (platform-specific tabs), keep items and show skeleton while upgrading
    return merged;
  }, [items, imgMap, platform]);

  // Last-mile filter applied to the exact array we render
  const rowsForUI = useMemo(() => {
    const base = displayItems || [];
    if (!isAllTab) return base;
    return base.filter((r) => !!bestImgFor(r));
  }, [displayItems, isAllTab, imgMap]);

  // Fetch from SavedListing via internal catalog API (DB only, no external scraping)
  const fetchSavedPage = async (p: string, off: number, lim: number) => {
    try {
      const usp = new URLSearchParams();
      usp.set('platform', p);
      usp.set('q', q);
      usp.set('offset', String(off));
      usp.set('limit', String(lim));
      // categories can be wired in if needed; filters aren't supported server-side yet
      const res = await fetch(`/api/catalog?${usp.toString()}`, { cache: 'no-store' });
      if (!res.ok) return { items: [], total: 0 };
      const data = await res.json();
      const items = Array.isArray(data.items) ? (data.items as ExternalListing[]) : [];
      // No total provided; infer exhaustion when fewer than requested are returned
      return { items, total: off + items.length };
    } catch {
      return { items: [], total: 0 };
    }
  };

  const loadMore = async () => {
    if (loading || exhausted) return;
    setLoading(true);
    try {
      const pageResp = await fetchSavedPage(platform, offset, batch);
      const { items: page, total } = pageResp;
      const before = items.length;
      const deduped = dedupMerge(items, page || []);
      const after = deduped.length;
      setItems(deduped.slice(0, max));
      setOffset(offset + (page?.length || 0));
      if ((page?.length || 0) === 0 || after >= total || after >= max) setExhausted(true);
    } catch {
      // suppress UI crash, mark exhausted to avoid loops
      setExhausted(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // IntersectionObserver to auto-load
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      loadMore();
    }, { rootMargin: '1000px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [platform, q, batch, max, offset, items.length, filters.minPrice, filters.maxPrice, filters.minMoq, filters.maxMoq]);

  // Auto-load once on mount if the initial items are fewer than a page
  useEffect(() => {
    if (items.length < Math.min(batch, max) && !exhausted) {
      // small backoff to allow first paint
      const t = setTimeout(() => loadMore(), 200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve current batch of item images to local /cache paths OR attempt upgrade when image is a bad placeholder
  useEffect(() => {
    let aborted = false;
    // 1) Direct external image URLs to cache (exclude already cached/seed or already resolved)
    const directImages: string[] = [];
    // 1b) Track IndiaMART detail URLs needing an upgrade because current cached image is bad
    const needsUpgradeDetail: string[] = [];
    for (const it of items) {
      const rawImg = String(it.image || '');
      // Resolve direct external images to cache
      if (rawImg && !rawImg.startsWith('/cache/') && !rawImg.startsWith('/seed/') && !imgMap[rawImg]) {
        directImages.push(rawImg);
      }
      // If current image is a /cache/ path but maps to a bad hash, schedule detail upgrade (only IndiaMART URLs)
      if (rawImg && rawImg.startsWith('/cache/') && isBadImageHashFromPath(rawImg)) {
        try {
          const host = new URL(String(it.url || '')).hostname.toLowerCase();
          if (/indiamart\.com$/.test(host)) needsUpgradeDetail.push(String(it.url || ''));
        } catch {}
      }
      // If current image ultimately resolves to seed/sleeves or is toxic via Next optimizer, also schedule an IM detail upgrade
      try {
        const host = new URL(String(it.url || '')).hostname.toLowerCase();
        if (/indiamart\.com$/.test(host) && isSeedOrBad(rawImg)) {
          needsUpgradeDetail.push(String(it.url || ''));
        }
      } catch {}
    }
    // 2) For items without a usable image, try resolving from the product detail URL (e.g., Alibaba)
    const fromDetail = items
      .filter((it) => {
        const img = String(it.image || '');
        return !img || img.startsWith('/seed/');
      })
      .map((it) => String(it.url || ''))
      .filter((u) => {
        if (!u || imgMap[u]) return false;
        try {
          const host = new URL(u).hostname.toLowerCase();
          // Allow detail resolvers we support server-side: Alibaba, Made-in-China, IndiaMART
          return host.endsWith('alibaba.com') || host.endsWith('made-in-china.com') || host.endsWith('indiamart.com');
        } catch { return false; }
      });
  const toResolve = Array.from(new Set([...directImages, ...fromDetail]));
  // Separate upgrade queue for IndiaMART bad hashes (detail-level resolver endpoint)
  const upgradeQueue = Array.from(new Set(needsUpgradeDetail));
  // Proceed if there's anything to do: either direct/seed resolves or upgrade attempts
  if (!toResolve.length && !upgradeQueue.length) return;
    (async () => {
      for (const u of toResolve) {
        try {
          const usp = new URLSearchParams();
          usp.set('src', u);
          const res = await fetch(`/api/external/resolve-img?${usp.toString()}`, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = await res.json();
          const localPath = String(data?.localPath || '');
          if (!localPath || aborted) continue;
          setImgMap((m) => (m[u] ? m : { ...m, [u]: localPath }));
        } catch {}
      }
      // Attempt upgrades for IndiaMART seed/bad images via detail upgrade endpoint
      for (const detailUrl of upgradeQueue) {
        if (aborted) break;
        try {
          const usp = new URLSearchParams();
          // API expects 'src' and can detect IndiaMART detail pages
          usp.set('src', detailUrl);
          const res = await fetch(`/api/external/resolve-img?${usp.toString()}`, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = await res.json();
          const localPath = String(data?.localPath || '');
          if (localPath && !isSeedOrBad(localPath)) {
            setImgMap((m) => (m[detailUrl] ? m : { ...m, [detailUrl]: localPath }));
          }
        } catch {}
      }
    })();
    return () => { aborted = true; };
  }, [items, imgMap]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-3">
  {rowsForUI.map((it) => {
          const title = (it as any).displayTitle || computeDisplayTitle(it);
          const qMin = parseMoq(it.moq) ?? parseMoq(`${it.price || ''} ${it.title || ''} ${it['description'] || ''}`) ?? null;
          const urlKey = String(it.url || '');
          const combinedText = `${it.price || ''}\n${it.title || ''}\n${it['description'] || ''}`;
          const parsedHeuristic = parsePriceTiers(combinedText) || [];
          const parsedRobust = extractQtyTiersFromText(combinedText) || [];
          const mergedParsed = (() => {
            const map = new Map<number, PriceTier>();
            for (const t of [...parsedHeuristic, ...parsedRobust]) if (!map.has(t.min)) map.set(t.min, t);
            return Array.from(map.values()).sort((a, b) => a.min - b.min);
          })();
          const tiers = (detailTiers[urlKey] && detailTiers[urlKey].length ? detailTiers[urlKey] : mergedParsed);
          const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);
          // Prefer tiers with min > 1 when present to avoid showing a misleading ">1" MOQ
          const hasHigherThanOne = sortedTiers.some(t => (t?.min ?? 0) > 1);
          const visibleTiers = hasHigherThanOne ? sortedTiers.filter(t => (t?.min ?? 0) > 1) : sortedTiers;
          // Sanitize labels: remove stray "copy" strings and format numbers with commas
          const { formatNumberEN } = require('@/lib/format');
          const fmtNum = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? formatNumberEN(n) : '');
          const cleanLabel = (t: PriceTier) => {
            const base = (t.label || (t.max != null ? `${fmtNum(t.min)}-${fmtNum(t.max)}` : `${fmtNum(t.min)}+`))
              .replace(/\bcopy\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            return base;
          };
          // Collapse to a single MOQ label (≥min) for standardized display
          const moqFromVisible = (() => {
            const mins = visibleTiers.map(t => t?.min).filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 1);
            if (mins.length) return Math.min(...mins);
            return null;
          })();
          const moqMin = moqFromVisible ?? (typeof qMin === 'number' && qMin > 1 ? qMin : null);
          const moqLabel = moqMin && moqMin > 1 ? `≥${formatNumberEN(moqMin)}` : '';
          let isAlibaba = false;
          let isMIC = false;
          try {
            const u = new URL(urlKey);
            const host = u.hostname.toLowerCase();
            isAlibaba = host.includes('alibaba.com');
            isMIC = host.includes('made-in-china.com');
          } catch {}
          const isIndiaMart = (() => { try { return new URL(urlKey).hostname.toLowerCase().includes('indiamart.com'); } catch { return false; } })();
          const hrefInternal = isIndiaMart ? `/indiamart/detail?url=${encodeURIComponent(urlKey)}` : it.url;
          // Compute fallback-safe image and best non-seed candidate
          const rawImg = String(it.image || '');
          const safeImg = resolveFallbackImage(rawImg, it.title || title, it.description || '');
          const bestImg = bestImgFor(it);
          const showBlurWarning = rawImg && isBadImageHashFromPath(rawImg) && !safeImg;
          return (
            <a key={it.url} href={hrefInternal} target={isIndiaMart ? '_self' : '_blank'} rel={isIndiaMart ? undefined : 'noopener'} className="border rounded-xl p-3 hover:shadow transition bg-white">
              <div className="aspect-square bg-gray-100 rounded-md mb-3 overflow-hidden">
                {bestImg && !isSeedOrBad(bestImg)
                  ? <img src={bestImg} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Upgrading…</div>}
                {showBlurWarning && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white">Refreshing…</div>}
              </div>
              {it.storeName ? <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={it.storeName}>{it.storeName}</div> : null}
              <div className="font-medium text-sm mt-0.5 text-gray-900 dark:text-gray-100 line-clamp-2 md:line-clamp-none" title={title}>{title || 'See listing'}</div>
              {(() => {
                const primary = it.price && it.price.toString().trim().length ? it.price : '';
                const tierPrice = tiers.length ? (tiers[0]?.priceText || '') : '';
                let display = primary || tierPrice;
                if (!display) {
                  const combined = `${it.price || ''} ${it.title || ''} ${it['description'] || ''}`;
                  // 1) Currency + amount
                  let m = combined.match(/(US\s*\$|US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/);
                  if (m) display = m[0];
                  // 2) Bare numeric range -> prefix with US$ for MIC
                  if (!display) {
                    const range = combined.match(/\b(\d{1,4}(?:[\.,]\d{1,2})?)\s*[-~–]\s*(\d{1,4}(?:[\.,]\d{1,2})?)\b/);
                    if (range) {
                      let prefix = '';
                      try { const u = new URL(String(it.url || '')); if (u.hostname.toLowerCase().includes('made-in-china')) prefix = 'US$'; } catch {}
                      display = `${prefix}${range[1]}-${prefix}${range[2]}`;
                    }
                  }
                }
                return (
                  <div className="mt-1 text-lg font-semibold text-orange-600">{display ? `${display} / unit` : 'See listing'}</div>
                );
              })()}
              {moqMin && moqMin > 1 ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span className="truncate" title={moqLabel}>{moqLabel}</span>
                    <span>0%</span>
                  </div>
                </div>
              ) : (() => {
                const combinedForGuess = combinedText;
                const inferred = typeof qMin === 'number' ? inferUpperBoundFromText(combinedForGuess, qMin) : undefined;
                const filterMax = (Number.isFinite(filters.maxMoq as number) && (filters.maxMoq as number) > 0) ? (filters.maxMoq as number) : undefined;
                let upper = inferred || filterMax;
                if (typeof qMin === 'number' && qMin > 0) {
                  if (!upper || upper <= qMin) upper = Math.min(qMin * 10, 1_000_000_000);
                }
                const range = (typeof qMin === 'number' && qMin > 0 && upper)
                  ? `${qMin}-${upper}`
                  : (typeof qMin === 'number' && qMin > 0 ? `${qMin}-${Math.min(qMin * 10, 1_000_000_000)}` : '…-…');
                // Build a synthetic single-tier ladder so the progress bar renders with consistent styling
                const syntheticTiers: PriceTier[] = (typeof qMin === 'number' && qMin > 0)
                  ? [{ min: qMin, priceText: '', label: `≥${formatNumberEN(qMin)}` }]
                  : [];
                return (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>{(typeof qMin === 'number' && qMin > 1) ? `≥${formatNumberEN(qMin)}` : range}</span>
                      <span>0%</span>
                    </div>
                    {/* Progress bar removed per standardization */}
                  </div>
                );
              })()}
              {/* Lazy-fetch detailed price tiers for Alibaba and Made-in-China listings when not already available */}
              {(isAlibaba || isMIC) && urlKey && !detailTiers[urlKey] ? (
                <TierDetailFetcher url={urlKey} onTiers={(ts) => setDetailTiers((m) => (m[urlKey] ? m : { ...m, [urlKey]: ts }))} />
              ) : null}
            </a>
          );
        })}
      </div>
  <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">Showing {rowsForUI.length} listings</div>
      <div className="flex items-center justify-center py-6" ref={sentinelRef}>
        <button
          type="button"
          onClick={() => loadMore()}
          disabled={loading || exhausted}
          className="px-4 py-2 rounded-md border text-sm bg-white hover:bg-gray-50 disabled:opacity-60"
        >
          {exhausted ? 'No more results' : (loading ? 'Loading…' : 'Load more')}
        </button>
      </div>
    </div>
  );
}

function TierDetailFetcher({ url, onTiers }: { url: string; onTiers: (tiers: PriceTier[]) => void }) {
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const resp = await fetch(`/api/external/price-tiers?src=${encodeURIComponent(url)}`, { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json();
        const arr = Array.isArray(data?.tiers) ? (data.tiers as PriceTier[]) : [];
        if (!aborted && arr.length) onTiers(arr);
      } catch {}
    })();
    return () => { aborted = true; };
  }, [url, onTiers]);
  return null;
}
