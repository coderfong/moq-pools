import * as cheerio from 'cheerio';
// cheerio v1 ESM doesn't export a concrete Element type; use a minimal alias to satisfy TS
type CheerioEl = any;
import { ExternalListing } from './types';
import { cacheExternalImage } from '../imageCache';
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
        const cached = await cacheExternalImage(it.image);
        if (cached?.localPath) it.image = cached.localPath;
      } catch {}
    }
  }

  // Provider-side quality filter: drop obviously empty / low-signal entries
  const qualityFiltered = items.filter(it => {
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

export async function getIndiaMartDetailMainImage(detailUrl: string): Promise<string | null> {
  try {
    const res = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://dir.indiamart.com/',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    // Try product gallery image selectors including #prdimgdiv plus meta/og/image JSON fallbacks.
    const candidates: string[] = [];
    const sel = [
      'img#prdimgdiv',
      '#prdimgdiv img',
      'img#bigImage',
      '.product-image img',
      '.pdp-image img',
      '.prod-image img',
      '.gal-image img',
      '.image-gallery img',
      'img.primary-image',
      '.main-product-image img',
      '.zoomWindow img',
      '.pimg img',
    ].join(', ');
    $(sel).each((_, el) => {
      const node = $(el);
      const attrs = [
        'data-zoom','data-large','data-zoom-src','data-src','data-original','data-image','data-big','data-large-src','data-main','data-lazy','data-lazysrc','data-zoom-image','src'
      ];
      for (const a of attrs) {
        const v = node.attr(a);
        if (v && !/placeholder|noimage|default/i.test(v)) candidates.push(v);
      }
    });
    // Meta tags
    const og = $('meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]').attr('content');
    if (og && !/placeholder|noimage|default/i.test(og)) candidates.push(og);
    // Link rel images
    $('link[rel="preload"][as="image"], link[rel="image_src"], link[rel="thumbnail"]').each((_, el)=>{
      const href = $(el).attr('href');
      if (href && !/placeholder|noimage|default/i.test(href)) candidates.push(href);
    });
    // Lightweight JSON sniff: search for image URL patterns inside script tags containing 'image' & 'zoom'
    if (candidates.length === 0) {
      const scriptImgRegex = /https?:[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi;
      $('script').each((_, sEl) => {
        if (candidates.length > 4) return false; // stop after a few
        const txt = $(sEl).html() || '';
        if (!/(imimg|indiamart|cdn|image|zoom)/i.test(txt)) return; // heuristic reduce noise
        const matches = txt.match(scriptImgRegex) || [];
        for (const m of matches) {
          if (/sprite|icon|logo|placeholder|noimage|default/i.test(m)) continue;
            candidates.push(m);
            if (candidates.length > 4) break;
        }
      });
    }
    // De-dupe while preserving order
    const seen = new Set<string>();
    const uniq = candidates.filter(c => { const k = c.split('?')[0]; if (seen.has(k)) return false; seen.add(k); return true; });
    candidates.length = 0; candidates.push(...uniq);
    // Generic fallback scan: if still no candidates, look at any <img> and parse src/srcset for imimg/indiamart CDN
    if (candidates.length === 0) {
      $('img').each((_, el) => {
        const node = $(el);
        const rawSrc = node.attr('src') || node.attr('data-src') || '';
        const srcset = node.attr('srcset');
        if (srcset) {
          // pick largest width candidate in srcset
          const parts = srcset.split(',').map(s => s.trim());
          let best: { url: string; w: number } | null = null;
          for (const p of parts) {
            const m = p.match(/(https?:[^\s]+)\s+(\d+)w/);
            if (m) {
              const w = parseInt(m[2], 10) || 0;
              if (!best || w > best.w) best = { url: m[1], w };
            } else if (/^https?:/i.test(p)) {
              if (!best) best = { url: p, w: 0 };
            }
          }
          if (best && /imimg|indiamart/i.test(best.url) && !/sprite|icon|logo|placeholder|noimage|default/i.test(best.url)) candidates.push(best.url);
        }
        if (rawSrc && /imimg|indiamart/i.test(rawSrc) && !/sprite|icon|logo|placeholder|noimage|default/i.test(rawSrc)) {
          candidates.push(rawSrc);
        }
      });
    }
    // Heuristic scoring to pick best candidate (prefer imimg CDN, larger size hints, jpeg/webp, avoid logo/icon/thumb)
    function score(u: string, idx: number): number {
      const s = u.toLowerCase();
      let sc = 0;
      if (/imimg\.com/.test(s)) sc += 40;
      if (/indiamart\.com/.test(s)) sc += 15;
      if (/[?&](?:w|width|h|height)=\d{3,4}/.test(s)) sc += 10;
      if (/(large|zoom|big)/.test(s)) sc += 12;
      if (/(thumb|small|icon|logo|placeholder|default)/.test(s)) sc -= 50;
      if (/\.jpe?g($|\?)/.test(s)) sc += 8;
      if (/\.webp($|\?)/.test(s)) sc += 6;
      if (/quality=\d{2}/.test(s)) sc += 3;
      sc -= idx; // slight preference for first-found when scores tie closely
      return sc;
    }
    if (candidates.length > 1) {
      candidates.sort((a, b) => score(b, candidates.indexOf(b)) - score(a, candidates.indexOf(a)));
    }
    let src = candidates.length ? candidates[0] : '';
    src = src && !/placeholder|noimage|default/i.test(src) ? toAbs(src) : '';
    // Diagnostics: optionally log snippet if still missing
    if (!src && String(process.env.IM_IMAGE_DEBUG || '') === '1') {
      const bodyLen = html.length;
      const preview = html.slice(0, 400).replace(/\s+/g,' ').trim();
      // eslint-disable-next-line no-console
      console.log(`[INDIAMART][MISS] detailUrl=${detailUrl} len=${bodyLen} preview='${preview}'`);
    }
    // Canonical / proddetail fallback fetch if still missing image: some directory product pages point to a canonical product detail page containing the gallery.
    if (!src) {
      let canonical = $('link[rel="canonical"]').attr('href') || '';
      if (!canonical) {
        // Look for meta og:url or a proddetail URL embedded in scripts
        const ogUrl = $('meta[property="og:url"]').attr('content');
        if (ogUrl) canonical = ogUrl;
        if (!canonical) {
          const scriptHtml: string[] = [];
          $('script').each((_, s) => { const t = $(s).html(); if (t && /proddetail/i.test(t)) scriptHtml.push(t); });
          for (const t of scriptHtml) {
            const m = t.match(/https?:\/\/[^'"\s>]+proddetail[^'"\s>]*/i); if (m) { canonical = m[0]; break; }
          }
        }
      }
      if (canonical && /indiamart\.com/i.test(canonical) && canonical !== detailUrl) {
        try {
          const res2 = await fetch(canonical, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': detailUrl,
            },
            cache: 'no-store'
          });
          if (res2.ok) {
            const html2 = await res2.text();
            const $2 = cheerio.load(html2);
            const cand2: string[] = [];
            $2('img#prdimgdiv, #prdimgdiv img, img#bigImage, .product-image img, .pdp-image img').each((_, el) => {
              const n = $2(el);
              const attrs = ['data-zoom','data-large','data-zoom-src','data-src','src'];
              for (const a of attrs) {
                const v = n.attr(a); if (v && /imimg|indiamart/i.test(v) && !/placeholder|noimage|default/i.test(v)) cand2.push(v);
              }
            });
            if (!cand2.length) {
              // Generic scan on canonical page
              $2('img').each((_, el) => {
                const sAttr = $2(el).attr('src') || $2(el).attr('data-src') || '';
                if (sAttr && /imimg|indiamart/i.test(sAttr) && !/sprite|icon|logo|placeholder|noimage|default/i.test(sAttr)) cand2.push(sAttr);
              });
            }
            if (cand2.length) src = toAbs(cand2[0]);
          }
        } catch {}
      }
    }
    // Headless fallback (optional) if still missing
    if (!src && String(process.env.IM_DETAIL_HEADLESS || '') === '1') {
      const headlessImg = await headlessDetailImage(detailUrl).catch(() => null);
      if (headlessImg) src = headlessImg;
    }
    return src || null;
  } catch {
    return null;
  }
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

async function headlessDetailImage(detailUrl: string): Promise<string | null> {
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
