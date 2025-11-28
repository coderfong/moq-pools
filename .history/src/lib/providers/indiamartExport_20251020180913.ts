import * as cheerio from 'cheerio';
import { ExternalListing } from './types';

/*
  IndiaMART Export Directory Support
  Pages like: https://export.indiamart.com/search.php?ss=Disposable%20Fabrics&tags=...
  Individual product detail: https://export.indiamart.com/products/?id=...&kwd=...
  Goal: lightweight scraper for export-facing catalogue to complement dir.indiamart.com when sparse.
*/

export interface ExportCategoryItem { label: string; url: string; count?: number; }
export interface ExportListing extends ExternalListing {}

function norm(s?: string) { return (s||'').replace(/\s+/g,' ').trim(); }
function abs(u: string) { try { return new URL(u, 'https://export.indiamart.com').toString(); } catch { return u; } }

const SEARCH_URL = (q: string) => `https://export.indiamart.com/search.php?ss=${encodeURIComponent(q)}`;
// Some search URLs include tracking params; we keep base + ss for deterministic fetch

function isExportProductUrl(u: string) {
  try {
    const url = new URL(u);
    return url.hostname === 'export.indiamart.com' && url.pathname.replace(/\/+$/,'') === '/products' && url.searchParams.has('id');
  } catch { return false; }
}

function normalizeExportProductUrl(u: string) {
  try {
    const url = new URL(u);
    if (url.hostname !== 'export.indiamart.com' || url.pathname !== '/products/') return u;
    const id = url.searchParams.get('id');
    return id ? `https://export.indiamart.com/products/?id=${id}` : u;
  } catch { return u; }
}

// Parse export search result cards and return deep product links with basic metadata
export async function fetchExportSearchCards(q: string, debug = false): Promise<ExportListing[]> {
  try {
    const res = await fetch(SEARCH_URL(q), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://export.indiamart.com/'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const items: ExportListing[] = [];
    // Helper: attempt to extract export product id from various attributes/snippets
    const tryExtractId = (s: string | undefined | null): string | null => {
      if (!s) return null;
      const m = String(s).match(/[?&]id=(\d{6,})\b/);
      return m?.[1] || null;
    };
    const tryExtractIdFromNode = (node: cheerio.Cheerio<any>): string | null => {
      // onclick handlers sometimes contain id=123456789
      const onclick = node.find('[onclick]').attr('onclick') || node.attr('onclick') || '';
      let id = tryExtractId(onclick);
      if (id) return id;
      // data attributes common on result cards
      const attrs = ['data-id','data-prdid','data-prod-id','data-productid','data-pid'];
      for (const a of attrs) {
        const v = node.attr(a) || node.find(`[${a}]`).attr(a);
        if (v && /\d{6,}/.test(v)) {
          const m = String(v).match(/\d{6,}/);
          if (m) return m[0];
        }
      }
      // Any anchor/data-href containing an id
      const hrefAny = node.find('a[href], a[data-href]').toArray().map(el => ($(el).attr('href') || $(el).attr('data-href') || '')).join(' ');
      id = tryExtractId(hrefAny);
      if (id) return id;
      return null;
    };

    // Common card wrappers; keep broad selectors to survive minor DOM changes
    $('.prd-list .prd-card, .prod-list .prd-card, .list_prd .prd-card, .prd-card, .prod-card, .product, .prd, .prd-lst, .result-card').each((_i, el) => {
      const card = $(el);
      // Support both "/products/?id=" and "products/?id=" (no leading slash)
      const a1 = card.find('a[href*="/products/?id="], a[href*="products/?id="]').first();
      const a2 = card.find('a[data-href*="/products/?id="], a[data-href*="products/?id="]').first();
      // Raw hrefs (may be search pages or tracking)
  const rawHref = a1.attr('href') || a2.attr('data-href') || card.find('a').attr('href') || '';
      let href = abs(rawHref);
      // Extract product id robustly
      let id = tryExtractId(href) || tryExtractIdFromNode(card);
      if (id) {
        href = `https://export.indiamart.com/products/?id=${id}`;
      } else {
        // Try within inner anchors again
        const inner = a1.attr('href') || a2.attr('data-href') || '';
        id = tryExtractId(inner);
        if (id) href = `https://export.indiamart.com/products/?id=${id}`; else href = abs(inner || href);
      }
      href = normalizeExportProductUrl(href);
      // Skip entries that do not resolve to a product link to avoid search-page links
      if (!isExportProductUrl(href)) return;
      const title = norm(card.find('.prd-name a, .prod-name a, .product-title a').first().text())
        || card.find('a[title]').first().attr('title')
        || norm(card.find('a').first().text())
        || '';
      const price = norm(card.find('.price, .prd-price, .prod-price').first().text()) || '';
      const rawImg = card.find('img').attr('data-src') || card.find('img').attr('data-zoom') || card.find('img').attr('src') || '';
      const image = rawImg ? abs(rawImg) : '';
      const storeName = norm(card.find('.cmp-name, .seller, .cmp_title, .company-name').first().text()) || '';
  if (href && title) items.push({ platform: 'INDIAMART_EXPORT', title, url: href, image, price, moq: '', storeName, description: '' });
    });

    // Fallback: in case some products aren't wrapped in recognizable card containers, scan all anchors
    if (items.length === 0) {
      const seen = new Set<string>();
      $('a[href]').each((_, a) => {
        const hrefRaw = $(a).attr('href') || '';
        if (!/products\/?\?id=\d{6,}/.test(hrefRaw)) return;
        let href = abs(hrefRaw);
        const id = tryExtractId(href);
        if (id) href = `https://export.indiamart.com/products/?id=${id}`;
        if (!isExportProductUrl(href)) return;
        if (seen.has(href)) return;
        seen.add(href);
        const title = norm($(a).attr('title') || $(a).text()) || 'IndiaMART Export Product';
        let rawImg = $(a).closest('.product,.prd,.prd-card,.result-card').find('img').first().attr('data-src')
          || $(a).closest('.product,.prd,.prd-card,.result-card').find('img').first().attr('data-zoom')
          || $(a).closest('.product,.prd,.prd-card,.result-card').find('img').first().attr('src')
          || '';
        const image = rawImg ? abs(rawImg) : '';
        items.push({ platform: 'INDIAMART_EXPORT', title, url: href, image, price: '', moq: '', storeName: '', description: '' });
      });
    }
    if (debug) console.log(`[IM-EXPORT] search cards parsed ${items.length} items`);
    return items;
  } catch {
    return [];
  }
}

// Common selectors heuristics for product link blocks
function isProductHref(href: string) {
  return /products\/\?id=/.test(href);
}

const exportCache: Map<string, { exp: number; html: string; subcategories: ExportCategoryItem[]; listings: ExportListing[] }> = new Map();
const EXPORT_TTL_MS = 2 * 60 * 1000; // 2 minutes; adjust as needed

export async function fetchExportCategoryPage(q: string, debug = false): Promise<{ subcategories: ExportCategoryItem[]; listings: ExportListing[]; rawHtml: string; }>{
  const key = q.toLowerCase();
  const now = Date.now();
  const cached = exportCache.get(key);
  if (cached && cached.exp > now) {
    if (debug) console.log(`[IM-EXPORT] cache hit '${q}'`);
    return { subcategories: cached.subcategories, listings: cached.listings, rawHtml: cached.html };
  }
  const url = SEARCH_URL(q);
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, cache: 'no-store' });
    if (!res.ok) return { subcategories: [], listings: [], rawHtml: '' };
    html = await res.text();
  } catch { return { subcategories: [], listings: [], rawHtml: '' }; }
  const $ = cheerio.load(html);
  const subs: ExportCategoryItem[] = [];
  // Category blocks often have repeating label lines, pick distinct anchors with counts in parentheses
  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = norm($(a).text());
    if (!href || !text) return;
    if (/products\/?\?id=/.test(href)) return; // skip product links here
    // Count pattern e.g. "(3227)" – extract if present
    const m = text.match(/(.+?)\s*\((\d{1,6})\)$/);
    let label = text; let count: number | undefined;
    if (m) { label = norm(m[1]); count = Number(m[2]); }
    // Heuristic: avoid generic View Less links
    if (/view\s+less/i.test(label)) return;
    // Avoid duplicates
    const absUrl = abs(href);
    if (subs.some(s => s.url === absUrl || s.label.toLowerCase() === label.toLowerCase())) return;
    // Only keep plausible category-ish labels (2+ words or > 8 chars)
    if (label.length < 5) return;
    subs.push({ label, url: absUrl, count });
  });

  // Extract lightweight listing cards present on the search page (if any)
  const listings: ExportListing[] = [];
  const seenUrls = new Set<string>();
  $('a').each((_, a) => {
    const hrefRaw = $(a).attr('href') || '';
    if (!isProductHref(hrefRaw)) return;
    const url = abs(hrefRaw.split('&utm')[0]);
    if (seenUrls.has(url)) return;
    const title = norm($(a).text()) || norm($(a).find('span,div').first().text());
    if (!title) return;
    seenUrls.add(url);
    listings.push({
      platform: 'INDIAMART_EXPORT',
      title,
      url,
      image: '',
      price: '',
      moq: '',
      storeName: '',
      description: ''
    });
  });
  if (debug) console.log(`[IM-EXPORT] q='${q}' subs=${subs.length} listings=${listings.length}`);
  exportCache.set(key, { exp: now + EXPORT_TTL_MS, html, subcategories: subs, listings });
  return { subcategories: subs, listings, rawHtml: html };
}

export async function fetchExportProductDetail(url: string, debug = false): Promise<ExportListing | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    // Dead/no-listing page detection: extremely short body or missing expected nodes
    const bodyTxt = norm($('body').text());
    if (!bodyTxt || bodyTxt.length < 40) return null;
    let title = norm($('h1, .prd-hd, .product-title, title').first().text());
    if (!title || /indiamart export$/i.test(title)) {
      // Attempt structured meta
      const metaTitle = $('meta[property="og:title"], meta[name="twitter:title"]').attr('content');
      if (metaTitle) title = norm(metaTitle);
    }
    if (!title) title = 'Product';
    // Price heuristics
    let price = norm($('.price, .prd-price, .product-price').first().text());
    if (!price) {
      const txt = $('body').text();
      const m = txt.match(/(₹|INR|Rs\.?|USD|US\$|\$)\s?[\d,]+(?:\.\d{1,2})?/);
      if (m) price = m[0];
    }
    const desc = norm($('.desc, .description, .prd-desc, .product-desc, p').slice(0,8).text()).slice(0,600);
    // Resolve a reasonable product image; prefer larger real images and normalize to absolute URL
    let img = $('meta[property="og:image"]').attr('content')
      || $('img.prd-img, .product-image img, .prd_img img, .image-gallery img').first().attr('data-zoom')
      || $('img.prd-img, .product-image img, .prd_img img, .image-gallery img').first().attr('data-src')
      || $('img.prd-img, .product-image img, .prd_img img, .image-gallery img').first().attr('src')
      || '';
    if (img && /data:image/.test(img)) img = '';
    if (img) img = abs(img);
    // Try to infer MOQ from text fragments
    let moq = '';
    const moqMatch = html.match(/MOQ[:\s]*([\d,]{1,5})/i) || desc.match(/(\b\d{1,4})\s*(pcs?|pieces?|units?)\b/i);
    if (moqMatch) moq = moqMatch[0];
    // Store / supplier name heuristic
    let storeName = norm($('.company-name, .seller-name, .cmpny-name').first().text());
    if (!storeName) {
      const sn = $('title').text().split('|')[0];
      if (sn && sn.length < 80) storeName = norm(sn);
    }
    // Remove trailing duplicated platform tokens
    title = title.replace(/\bIndiaMART\s*Export\b/ig, '').replace(/\bIndiaMART\b/ig, '').replace(/\s{2,}/g,' ').trim();
  return { platform: 'INDIAMART_EXPORT', title, url, price, image: img, moq, storeName, description: desc };
  } catch {
    return null;
  }
}

// High-level helper: fetch full export search result with optional detail enrichment
export async function fetchExportSearch(q: string, opts: { limit?: number; detail?: boolean; detailLimit?: number; debug?: boolean; detailAll?: boolean } = {}): Promise<ExportListing[]> {
  const { limit = 120, detail = true, detailLimit = 12, debug = false, detailAll = false } = opts;
  const { listings } = await fetchExportCategoryPage(q, debug);
  if (!listings.length) return [];
  let base = listings.slice(0, limit);
  if (!detail) return base;
  const enriched: ExportListing[] = [];
  const targets = detailAll ? base : base.slice(0, detailLimit);
  for (const l of targets) {
    const det = await fetchExportProductDetail(l.url, debug).catch(()=>null);
    if (det) enriched.push({ ...l, ...det }); else enriched.push(l);
  }
  if (!detailAll && base.length > detailLimit) enriched.push(...base.slice(detailLimit));
  // De-duplicate by normalized URL + distinct title variants
  const seen = new Set<string>();
  const final: ExportListing[] = [];
  for (const e of enriched) {
    const key = `${e.url.split('&id=')[0]}::${e.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push(e);
  }
  return final;
}
