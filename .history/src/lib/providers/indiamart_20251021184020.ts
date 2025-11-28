import * as cheerio from 'cheerio';
// cheerio v1 ESM doesn't export a concrete Element type; use a minimal alias to satisfy TS
type CheerioEl = any;
import { ExternalListing } from './types';
import { cacheExternalImage } from '../imageCache';
import { isExcludedByKeywords } from '../quality/textFilters';
import { BAD_IMAGE_HASHES } from '../badImages';
import { fetchExportCategoryPage } from './indiamartExport';

// Options:
//  headless: attempt a Playwright render (if installed) when static HTML sparse
//  upgradeImages: after initial scrape, attempt to fetch detail page main image
//  cacheImages: pass upgraded images through local cache (saves hotlinking)
//  limit: maximum listings to return
export type FetchOptions = { limit?: number; headless?: boolean; upgradeImages?: boolean; cacheImages?: boolean; debug?: boolean; forceHeadless?: boolean };

// Lightweight in-memory metrics (dev only usage) – no persistence
interface Metrics { lastDurMs: number; avgMs: number; count: number; p95Ms: number; lastResult: number; headlessPromotions: number; sparsePromotions: number; }
export const indiaMartMetrics: Metrics = { lastDurMs: 0, avgMs: 0, count: 0, p95Ms: 0, lastResult: 0, headlessPromotions: 0, sparsePromotions: 0 };
const lastSamples: number[] = [];

const SEARCH_URL = (q: string, page = 1) => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q)}&pg=${page}`;

// IndiaMART image domain allow-list and blockers
const IMIMG_OK = /(^|\.)imimg\.com$/i;
const BLOCKED_PATTERNS = [
  /export\.imimg\.com\/style\/countrySvg\.png/i, // country flag icon
  /\.svg(\?|$)/i,
  /sprite|icon|placeholder|logo/i,
];

// normalize to absolute URL with base fallback
function abs(u: string, base: string) {
  try { return new URL(u, base).toString(); } catch { return undefined; }
}

function looksBlocked(u?: string) {
  if (!u) return true;
  if (BLOCKED_PATTERNS.some((rx) => rx.test(u))) return true;
  try {
    const h = new URL(u).hostname;
    // Only accept imimg.com CDN variants (e.g., 5.imimg.com)
    if (!IMIMG_OK.test(h)) return true;
  } catch {
    return true;
  }
  return false;
}

function score(u: string) {
  // Prefer larger advertised sizes and jpg over png/webp
  let s = 0;
  const m = u.match(/(\d{3,4})x(\d{3,4})/);
  if (m) s += (+m[1]) * (+m[2]);
  if (/1000x1000/.test(u)) s += 2_000_000;
  if (/\.(jpe?g)(\?|$)/i.test(u)) s += 50_000;
  if (/\.png(\?|$)/i.test(u)) s += 25_000;
  if (/\.webp(\?|$)/i.test(u)) s += 20_000;
  return s;
}

// Canonicalize IndiaMART product/detail URLs by removing tracking / ephemeral query params that can trigger 403.
// Observed pattern: https://dir.indiamart.com/products/?id=...&pos=..&kwd=...&tags=.... -> keep only id + maybe kwd.
function canonicalizeIndiaMartUrl(u: string): string {
  try {
    const url = new URL(u, 'https://dir.indiamart.com');
    // Only process directory host
    if (!/\.indiamart\.com$/i.test(url.hostname)) return url.toString();
    // If path is /products/ with query id=..., reduce to /products/?id=<id>
    if (url.pathname.startsWith('/products')) {
      const id = url.searchParams.get('id');
      const kwd = url.searchParams.get('kwd');
      url.search = '';
      if (id) url.searchParams.set('id', id);
      if (kwd) url.searchParams.set('kwd', kwd); // optional for clarity
      return url.toString();
    }
    // Generic product/detail url: strip large param sets, keep essential ones
    const keep = new Set(['id','kwd']);
    if (url.search) {
      const entries = Array.from(url.searchParams.entries()).filter(([k]) => keep.has(k));
      url.search = '';
      for (const [k,v] of entries) url.searchParams.append(k,v);
    }
    return url.toString();
  } catch { return u; }
}

function normText(s?: string | null) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function toAbs(u: string) {
  try {
    const url = new URL(u, 'https://dir.indiamart.com');
    return url.toString();
  } catch {
    return u;
  }
}

function extractPriceAndCurrency(raw: string): { price: string; currency?: string } {
  const t = raw || '';
  // Match INR forms: ₹ 120, Rs. 120, INR 120; keep full original price string for display
  const m = t.match(/(₹|INR|Rs\.?|USD|US\$|\$)\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (m) {
    let cur = m[1];
    if (/^rs\.?$/i.test(cur) || cur === '₹' || /^inr$/i.test(cur)) cur = 'INR';
    if (cur === 'US$' || cur === '$') cur = 'USD';
    return { price: raw, currency: cur };
  }
  return { price: raw };
}

function extractMoq(raw: string): string | undefined {
  if (!raw) return undefined;
  // Common forms: "Min Order: 10 Piece", "Minimum Order Quantity 5", "MOQ 100", "≥ 50"
  const m = raw.match(/(?:MOQ|Min(?:imum)?\s*Order(?:\s*Quantity)?|≥)\s*:?\s*([\d,]{1,6})/i);
  if (m) return `MOQ ${m[1].replace(/,/g,'')}`;
  // Fallback: lone number + unit (Piece/Pieces/Unit)
  const m2 = raw.match(/([\d,]{1,6})\s*(?:pcs?|pieces?|units?|bags?|sets?)/i);
  if (m2) return `MOQ ${m2[1].replace(/,/g,'')}`;
  return undefined;
}

function parseListingCards($: cheerio.CheerioAPI, limit: number, debug = false): ExternalListing[] {
  const out: ExternalListing[] = [];
  // Broaden selectors to catch variant card containers
  $('.prod_box, .prod-card, .lst-product, .product-card, .prd, .p_card').each((_: number, el: CheerioEl) => {
    if (out.length >= limit) return false;
    const node = $(el);
  const a = node.find('a').filter((_: number, a: CheerioEl) => /product|detail|proddetail/i.test($(a).attr('href') || '')).first();
  const href = canonicalizeIndiaMartUrl(toAbs(a.attr('href') || ''));
    const title = normText(a.attr('title') || a.text());
    if (!href || !title) return;
    const priceText = normText(node.find('.pdp-price, .price, .prd-prc, .r_price').first().text());
    const { price, currency } = extractPriceAndCurrency(priceText);
    const moqRaw = normText(node.find('.moq, .min-order, .order-qty').first().text());
    const moq = extractMoq(moqRaw);
    // Image: prefer actual image src/data-src; skip placeholders
    let img = node.find('img').attr('data-src') || node.find('img').attr('src') || '';
    img = img && !/placeholder|noimage|default/i.test(img) ? toAbs(img) : '';
    const listing: ExternalListing = {
      platform: 'INDIAMART',
      title: title || 'Product',
      image: img || '',
      url: href,
      price: price || '',
      currency,
      moq: moq || moqRaw || '',
      storeName: normText(node.find('.cmp-name, .cmp-title, .company-name').first().text()),
      description: normText(node.find('.prod-dtls, .desc, .prd-desc, .specs').first().text()),
    };
    out.push(listing);
  });
  if (debug) console.log(`[INDIAMART] parseListingCards extracted ${out.length}`);
  return out;
}

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

async function fetchStatic(q: string, limit: number, debug = false): Promise<ExternalListing[]> {
  const out: ExternalListing[] = [];
  // Dynamically allow more pages for larger limits; hard cap to 30 to avoid runaway scraping
  const maxPages = Math.min(30, Math.ceil(limit / 18));
  // Track consecutive empty pages to early exit
  let emptyStreak = 0;
  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const url = SEARCH_URL(q, page);
    let html = '';
    try {
      const ua = UA_POOL[page % UA_POOL.length];
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://dir.indiamart.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }
    const $ = cheerio.load(html);
  let batch = parseListingCards($, limit - out.length, debug);
    const beforeDenseTotal = batch.length;
    // Fallback 1: loose anchors with product-ish hrefs if structured cards failed
    if (batch.length === 0) {
      const loose: ExternalListing[] = [];
  $('a').each((_: number, a: CheerioEl) => {
        if (loose.length >= (limit - out.length)) return false;
  const href = canonicalizeIndiaMartUrl($(a).attr('href') || '');
        if (!/product|detail|proddetail/i.test(href)) return;
        const title = normText($(a).attr('title') || $(a).text());
        if (!title) return;
        loose.push({
          platform: 'INDIAMART',
            title: title || 'Product',
            image: '',
            url: canonicalizeIndiaMartUrl(toAbs(href)),
            price: '',
            moq: '',
            storeName: '',
            description: '',
        });
      });
      if (loose.length && debug) console.log(`[INDIAMART] loose anchor fallback produced ${loose.length}`);
      batch = loose;
    }
    // Fallback 2: attempt to parse embedded JSON fragments that may contain listing info
    if (batch.length === 0) {
      const scripts: string[] = [];
  $('script').each((_: number, s: CheerioEl) => { const txt = $(s).html(); if (txt && /"price"|"moq"|"prod"/i.test(txt)) scripts.push(txt); });
      for (const sc of scripts) {
        try {
          const mArr = sc.match(/\{[^]*?\}/g) || [];
          for (const frag of mArr) {
            if (batch.length >= limit - out.length) break;
            if (!/price|title|product/i.test(frag)) continue;
            // Very loose sanitize
            const cleaned = frag.replace(/,(\s*[}\]])/g, '$1');
            let obj: any;
            try { obj = JSON.parse(cleaned); } catch { continue; }
            if (!obj) continue;
            const urlStr = obj.url || obj.link || '';
            const title = normText(obj.title || obj.name || '');
            if (!urlStr || !title) continue;
            batch.push({
              platform: 'INDIAMART',
              title,
              image: obj.image || obj.img || '',
              url: canonicalizeIndiaMartUrl(toAbs(urlStr)),
              price: obj.priceText || obj.price || '',
              moq: obj.moq || '',
              storeName: obj.store || obj.supplier || '',
              description: obj.desc || obj.description || '',
            });
          }
        } catch {}
        if (batch.length) break;
      }
      if (batch.length && debug) console.log(`[INDIAMART] script JSON fallback produced ${batch.length}`);
    }
    out.push(...batch);
    // If still sparse after normal extraction and under limit, attempt dense anchor harvesting (broad but filtered)
    if (out.length < limit && page === 1) {
      const dense: ExternalListing[] = [];
      const seenUrls = new Set(out.map(o => o.url));
      $('a[href]').each((_: number, aEl: CheerioEl) => {
        if (dense.length >= (limit - out.length)) return false;
        const href = String($(aEl).attr('href') || '');
        if (!/product|detail|proddetail|seller|supplier/i.test(href)) return;
  const abs = canonicalizeIndiaMartUrl(toAbs(href));
        if (seenUrls.has(abs)) return;
        const title = normText($(aEl).attr('title') || $(aEl).text()).slice(0, 140);
        if (!title || title.length < 4) return;
        seenUrls.add(abs);
        dense.push({ platform: 'INDIAMART', title: title || 'Product', image: '', url: abs, price: '', moq: '', storeName: '', description: '' });
      });
      if (dense.length && debug) console.log(`[INDIAMART] dense anchor harvest added ${dense.length}`);
      out.push(...dense);
    }
    if (debug) console.log(`[INDIAMART] page ${page} -> batch ${batch.length} (pre-dense ${beforeDenseTotal}), total so far ${out.length}`);
    if (batch.length === 0) emptyStreak++; else emptyStreak = 0;
    if (emptyStreak >= 2) { if (debug) console.log('[INDIAMART] early break due to consecutive empty pages'); break; }
    if (out.length >= limit) break;
  }
  if (debug) console.log(`[INDIAMART] static fetch complete (${out.length}) for term '${q}'`);
  return out;
}

async function fetchIndiaMartHeadless(q: string, limit: number): Promise<ExternalListing[]> {
  // Light headless implementation; only used if opts.headless true and static result sparse
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch { return []; }
  if (!chromium) return [];
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
    const page = await ctx.newPage();
    const url = SEARCH_URL(q, 1);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    const html = await page.content();
    const $ = cheerio.load(html);
    return parseListingCards($, limit);
  } catch {
    return [];
  } finally {
    try { await browser.close(); } catch {}
  }
}

// Enhanced search parser for IndiaMART directory results
export async function fetchIndiaMart(q: string, limit = 50, opts: FetchOptions = {}): Promise<ExternalListing[]> {
  const { debug } = opts;
  const t0 = Date.now();
  if (debug) console.log(`[INDIAMART] fetch start term='${q}' limit=${limit} headless=${!!opts.headless} forceHeadless=${!!opts.forceHeadless}`);
  let itemsStatic: ExternalListing[] = [];
  if (!opts.forceHeadless) itemsStatic = await fetchStatic(q, limit, !!debug);
  let items = itemsStatic;
  // Sparse detection threshold: if static produced < 6 and headless allowed, escalate
  const needHeadless = (opts.headless || opts.forceHeadless) && (opts.forceHeadless || itemsStatic.length < Math.min(6, limit));
  if (needHeadless) {
    const headlessItems = await fetchIndiaMartHeadless(q, limit).catch(() => []);
    if (headlessItems.length > itemsStatic.length) {
      items = headlessItems;
      indiaMartMetrics.headlessPromotions++;
    }
    indiaMartMetrics.sparsePromotions += itemsStatic.length < Math.min(6, limit) ? 1 : 0;
    if (debug) console.log(`[INDIAMART] headless fallback considered static=${itemsStatic.length} headless=${headlessItems.length}`);
  }

  // Final fallback: export.indiamart.com category search if still very sparse
  const exportEnabled = String(process.env.ENABLE_IM_EXPORT_FALLBACK || '1') !== '0';
  if (exportEnabled && items.length < Math.min(4, limit)) {
    try {
      const { listings } = await fetchExportCategoryPage(q, !!debug);
      if (listings.length) {
        // Merge instead of replace, de-dup by normalized URL
        const seen = new Set(items.map(i => i.url));
        let added = 0;
        for (const l of listings) {
          if (seen.has(l.url)) continue;
            seen.add(l.url);
            items.push(l);
            added++;
        }
        if (debug) console.log(`[INDIAMART] export fallback merged ${added} listings (base ${items.length - added})`);
      }
    } catch {}
  }

  // Optionally upgrade images by visiting detail pages (concurrency-limited)
  if (opts.upgradeImages) {
    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const it = items[i];
        const hasRealImage = !!(it && it.image && it.image.trim() && !it.image.startsWith('/seed/'));
        if (!it || hasRealImage) continue; // only attempt if missing or placeholder (/seed/) image
        try {
          const best = await getIndiaMartDetailMainImage(it.url);
          if (best) it.image = best;
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  }

  // Optional caching of images (only when explicitly requested to avoid overhead)
  if (opts.cacheImages) {
    for (const it of items) {
      if (!it.image) continue;
      try {
        const cached = await cacheExternalImage(it.image, { preferJpgForIndiaMart: true });
        if (cached?.localPath) it.image = cached.localPath;
      } catch {}
    }
  }

  // Provider-side quality filter: drop obviously empty / low-signal entries
  const qualityFiltered = items.filter(it => {
    // Early drop banned keyword listings
    if (isExcludedByKeywords(it.title, it.description).excluded) return false;
    const shortTitle = it.title.trim().length < 4;
    const hasAnyMeta = !!(it.price && it.price.length > 1) || !!(it.moq && it.moq.length > 1) || !!(it.storeName && it.storeName.length > 1) || (it.image && it.image.length > 0);
    // Allow if has meta OR title length is reasonable (>3) and URL looks like product detail
    const urlOk = /\/products\/.*id=/.test(it.url) || /proddetail|product/i.test(it.url);
    if (shortTitle && !hasAnyMeta) return false;
    if (!hasAnyMeta && !urlOk) return false;
    return true;
  });
  if (debug && qualityFiltered.length !== items.length) console.log(`[INDIAMART] quality filter removed ${items.length - qualityFiltered.length}`);

  const finalItems = qualityFiltered.slice(0, limit);
  const dur = Date.now() - t0;
  indiaMartMetrics.lastDurMs = dur;
  indiaMartMetrics.lastResult = finalItems.length;
  lastSamples.push(dur);
  if (lastSamples.length > 50) lastSamples.shift();
  indiaMartMetrics.count++;
  indiaMartMetrics.avgMs = lastSamples.reduce((a, b) => a + b, 0) / lastSamples.length;
  const sorted = [...lastSamples].sort((a,b)=>a-b);
  indiaMartMetrics.p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  if (debug) console.log(`[INDIAMART] returning ${finalItems.length} items in ${dur}ms`);
  return finalItems;
}

export async function getIndiaMartDetailImageCandidates(detailUrl: string): Promise<string[]> {
  // Robust candidate collector: favor real CDN images and avoid icons/flags/svg
  try {
    const res = await fetch(detailUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const base = detailUrl;
    const cand = new Set<string>();

    // 1) Primary product image block and nearby variants
    const $img = $('#prdimgdiv');
    const zoom = $img.attr('data-zoom'); if (zoom) { const u = abs(zoom, base); if (u) cand.add(u); }
    const src = $img.attr('src'); if (src) { const u = abs(src, base); if (u) cand.add(u); }
    const srcset = $img.attr('srcset');
    if (srcset) {
      srcset.split(',').map(s => s.trim().split(' ')[0]).forEach((u) => { const a = abs(u, base); if (a) cand.add(a); });
    }

    $('.prd_img img.drift-demo-trigger, .prd_img img#prdimgdiv, .prd_img img').each((_, el) => {
      const u = $(el).attr('data-zoom') || $(el).attr('data-src') || $(el).attr('src');
      if (u) { const a = abs(u, base); if (a) cand.add(a); }
      const ss = $(el).attr('srcset');
      if (ss) ss.split(',').map(s => s.trim().split(' ')[0]).forEach((u2) => { const a2 = abs(u2, base); if (a2) cand.add(a2); });
    });

    // 2) Meta tags og:image/twitter:image
    $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
      const u = $(el).attr('content'); if (u) { const a = abs(u, base); if (a) cand.add(a); }
    });

    // 3) link rel=image_src
    const link = $('link[rel="image_src"]').attr('href');
    if (link) { const a = abs(link, base); if (a) cand.add(a); }

    // 4) JSON-LD blocks
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).contents().text() || '');
        const imgs: string[] = Array.isArray((data as any)?.image) ? (data as any).image : ((data as any)?.image ? [(data as any).image] : []);
        imgs.forEach((u) => { const a = abs(u, base); if (a) cand.add(a); });
      } catch {}
    });

    // 5) Grep inline JSON for likely image fields
    $('script:not([type])').each((_, el) => {
      const t = $(el).html() || '';
      const rx = /"(?:image|imageUrl|mainImageUrl|prodImg|prdimg|zoomImg)"\s*:\s*"([^"]+)"/gi;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(t))) {
        const a = abs(m[1], base); if (a) cand.add(a);
      }
    });

    const filtered = Array.from(cand)
      .filter((u) => !!u)
      .filter((u) => !looksBlocked(u))
      .sort((a, b) => score(b) - score(a));

    return filtered;
  } catch {
    return [];
  }
}

export async function getIndiaMartDetailMainImage(detailUrl: string): Promise<string | null> {
  const ordered = await getIndiaMartDetailImageCandidates(detailUrl);
  if (!ordered.length) return null;
  // Skip known bad hash candidates when possible
  function hashOf(u: string): string | null { const m=u.match(/([a-f0-9]{40})/i); return m?m[1].toLowerCase():null; }
  let pick = ordered[0];
  for (const c of ordered) { const h=hashOf(c); if (!h || !BAD_IMAGE_HASHES.has(h)) { pick=c; break; } }
  return pick || null;
}

// Lazy singleton for headless browser (Playwright Chromium)
let _headless: { browser: any; closing: boolean } | null = null;
async function getBrowser() {
  if (_headless?.browser) return _headless.browser;
  try {
    const req: any = (0, eval)('require');
    let pw: any;
    try { pw = req('playwright'); } catch { pw = req('playwright-core'); }
    const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    _headless = { browser, closing: false };
    return browser;
  } catch {
    return null;
  }
}

export async function headlessIndiaMartDetailImage(detailUrl: string): Promise<string | null> {
  const browser = await getBrowser();
  if (!browser) return null;
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  let final: string | null = null;
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    // wait for either product image elements or generic imgs from imimg domain
    await page.waitForTimeout(1200);
    const html = await page.content();
    const $ = cheerio.load(html);
    const attempt = (sel: string) => {
      const arr: string[] = [];
      $(sel).each((_, el) => {
        const node = $(el);
        const src = node.attr('data-zoom') || node.attr('data-large') || node.attr('data-src') || node.attr('src') || '';
        if (src && /imimg|indiamart/i.test(src) && !/sprite|icon|logo|placeholder|noimage|default/i.test(src)) arr.push(src);
      });
      return arr;
    };
    let cands = attempt('img#prdimgdiv, #prdimgdiv img, img#bigImage, .product-image img, .pdp-image img, .prod-image img, .image-gallery img, img.primary-image');
    if (!cands.length) cands = attempt('img');
    if (!cands.length) {
      // srcset parse
      $('img[srcset]').each((_, el) => {
        const ss = $(el).attr('srcset') || '';
        const parts = ss.split(',').map(s=>s.trim());
        for (const p of parts) {
          const m = p.match(/(https?:[^\s]+)\s+(\d+)w/);
          if (m && /imimg|indiamart/i.test(m[1]) && !/sprite|icon|logo|placeholder|noimage|default/i.test(m[1])) cands.push(m[1]);
        }
      });
    }
    if (cands.length) final = toAbs(cands[0]);
  } catch {
    final = null;
  } finally {
    try { await page.close(); } catch {}
    try { await ctx.close(); } catch {}
  }
  return final;
}
