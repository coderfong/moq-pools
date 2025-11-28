import * as cheerio from 'cheerio';
import { ExternalListing } from './types';
import { cacheExternalImage } from '../imageCache';

export type FetchOptions = { limit?: number; headless?: boolean };

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

// Basic search parser for IndiaMART directory results
export async function fetchIndiaMart(q: string, limit = 50, opts: FetchOptions = {}): Promise<ExternalListing[]> {
  const out: ExternalListing[] = [];
  const maxPages = Math.min(5, Math.ceil(limit / 20));
  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const url = SEARCH_URL(q, page);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://dir.indiamart.com/',
      },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const html = await res.text();
    const $ = cheerio.load(html);

    // IndiaMART result cards commonly have .prod_box and related selectors
    $('.prod_box, .prod-card, .lst-product').each((_, el) => {
      if (out.length >= limit) return false;
      const node = $(el);
      const a = node.find('a').filter((_, a) => /product|detail|proddetail/i.test($(a).attr('href') || '')).first();
      const href = toAbs(a.attr('href') || '');
      const title = normText(a.attr('title') || a.text());
      // Price and MOQ often as text snippets
      const priceText = normText(node.find('.pdp-price, .price, .prd-prc, .r_price').first().text());
      const moqText = normText(node.find('.moq, .min-order, .order-qty').first().text());
      // Image: prefer actual image src/data-src; skip placeholders
      let img = node.find('img').attr('data-src') || node.find('img').attr('src') || '';
      img = img && !/placeholder|noimage|default/i.test(img) ? toAbs(img) : '';

      if (!href || !title) return;

      const listing: ExternalListing = {
        platform: 'INDIAMART',
        title: title || 'Product',
        image: img || '',
        url: href,
        price: priceText || '',
        moq: moqText || '',
        storeName: normText(node.find('.cmp-name, .cmp-title, .company-name').first().text()),
        description: normText(node.find('.prod-dtls, .desc, .prd-desc, .specs').first().text()),
      };
      out.push(listing);
    });
  }
  return out;
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
