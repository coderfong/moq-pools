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

export async function fetchExportCategoryPage(q: string, debug = false): Promise<{ subcategories: ExportCategoryItem[]; listings: ExportListing[]; rawHtml: string; }>{
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
  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (!/products\/?\?id=/.test(href)) return;
    const title = norm($(a).text());
    if (!title) return;
    listings.push({
      platform: 'INDIAMART',
      title,
      url: abs(href),
      image: '',
      price: '',
      moq: '',
      storeName: '',
      description: ''
    });
  });
  if (debug) console.log(`[IM-EXPORT] q='${q}' subs=${subs.length} listings=${listings.length}`);
  return { subcategories: subs, listings, rawHtml: html };
}

export async function fetchExportProductDetail(url: string, debug = false): Promise<ExportListing | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = norm($('h1, .prd-hd, .product-title').first().text()) || 'Product';
    // Price heuristics
    let price = norm($('.price, .prd-price, .product-price').first().text());
    if (!price) {
      const txt = $('body').text();
      const m = txt.match(/(₹|INR|Rs\.?|USD|US\$|\$)\s?[\d,]+(?:\.\d{1,2})?/);
      if (m) price = m[0];
    }
    const desc = norm($('.desc, .description, .prd-desc, p').slice(0,5).text()).slice(0,400);
    let img = $('img').first().attr('src') || '';
    if (img && /data:image/.test(img)) img = '';
    return { platform: 'INDIAMART', title, url, price, image: img, moq: '', storeName: '', description: desc };
  } catch {
    return null;
  }
}
