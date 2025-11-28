import * as cheerio from 'cheerio';
import { ExternalListing } from './types';
import { cacheExternalImage } from '../imageCache';

// Options:
//  headless: attempt a Playwright render (if installed) when static HTML sparse
//  upgradeImages: after initial scrape, attempt to fetch detail page main image
//  cacheImages: pass upgraded images through local cache (saves hotlinking)
//  limit: maximum listings to return
export type FetchOptions = { limit?: number; headless?: boolean; upgradeImages?: boolean; cacheImages?: boolean; debug?: boolean; forceHeadless?: boolean };

const SEARCH_URL = (q: string, page = 1) => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q)}&pg=${page}`;

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
  $('.prod_box, .prod-card, .lst-product, .product-card, .prd, .p_card').each((_: number, el: cheerio.Element) => {
    if (out.length >= limit) return false;
    const node = $(el);
  const a = node.find('a').filter((_: number, a: cheerio.Element) => /product|detail|proddetail/i.test($(a).attr('href') || '')).first();
    const href = toAbs(a.attr('href') || '');
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

async function fetchStatic(q: string, limit: number, debug = false): Promise<ExternalListing[]> {
  const out: ExternalListing[] = [];
  const maxPages = Math.min(5, Math.ceil(limit / 20));
  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const url = SEARCH_URL(q, page);
    let html = '';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
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
    // Fallback 1: loose anchors with product-ish hrefs if structured cards failed
    if (batch.length === 0) {
      const loose: ExternalListing[] = [];
  $('a').each((_: number, a: cheerio.Element) => {
        if (loose.length >= (limit - out.length)) return false;
        const href = $(a).attr('href') || '';
        if (!/product|detail|proddetail/i.test(href)) return;
        const title = normText($(a).attr('title') || $(a).text());
        if (!title) return;
        loose.push({
          platform: 'INDIAMART',
            title: title || 'Product',
            image: '',
            url: toAbs(href),
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
  $('script').each((_: number, s: cheerio.Element) => { const txt = $(s).html(); if (txt && /"price"|"moq"|"prod"/i.test(txt)) scripts.push(txt); });
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
              url: toAbs(urlStr),
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
    if (debug) console.log(`[INDIAMART] page ${page} -> batch ${batch.length}, total so far ${out.length}`);
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
  if (debug) console.log(`[INDIAMART] fetch start term='${q}' limit=${limit} headless=${!!opts.headless} forceHeadless=${!!opts.forceHeadless}`);
  let itemsStatic: ExternalListing[] = [];
  if (!opts.forceHeadless) itemsStatic = await fetchStatic(q, limit, !!debug);
  let items = itemsStatic;
  if ((opts.headless || opts.forceHeadless) && (opts.forceHeadless || itemsStatic.length < Math.min(10, limit))) {
    const headlessItems = await fetchIndiaMartHeadless(q, limit).catch(() => []);
    if (headlessItems.length > itemsStatic.length) items = headlessItems;
    if (debug) console.log(`[INDIAMART] headless fallback used static=${itemsStatic.length} headless=${headlessItems.length}`);
  }

  // Optionally upgrade images by visiting detail pages (concurrency-limited)
  if (opts.upgradeImages) {
    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const it = items[i];
        if (!it || it.image) continue; // only attempt if missing image
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

  const finalItems = items.slice(0, limit);
  if (debug) console.log(`[INDIAMART] returning ${finalItems.length} items`);
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
    // Try product gallery image selectors
    let src = $('img#bigImage, .product-image img, .pdp-image img, .prod-image img').attr('src')
      || $('img#bigImage, .product-image img, .pdp-image img, .prod-image img').attr('data-src')
      || '';
    src = src && !/placeholder|noimage|default/i.test(src) ? toAbs(src) : '';
    return src || null;
  } catch {
    return null;
  }
}
