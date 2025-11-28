import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';

type FetchOptions = { headless?: boolean };

function toAbs(base: string, href = '') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function normalizeImage(base: string, src = ''): string {
  if (!src) return '';
  let u = src.trim();
  if (u.includes(',')) u = u.split(',')[0]?.trim().split(' ')[0] || u;
  if (u.startsWith('data:')) return '';
  if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
  if (u.startsWith('//')) return `https:${u}`;
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

function parsePrice(text: string): string {
  const m = text.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥|HK\$|EUR|€)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥|HK\$|EUR|€)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/);
  return m ? m[0] : '';
}

function parseMoq(text: string): string | undefined {
  const m = text.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*[\d,]+/i);
  if (m) return m[0];
  const m2 = text.match(/\b\d{1,6}\s*(?:pcs?|pieces?|pairs?|sets?|units?|bags?|lots?)\b/i);
  return m2 ? m2[0] : undefined;
}

export async function fetchGlobalSources(q: string, limit = 60, opts?: FetchOptions): Promise<ExternalListing[]> {
  const base = 'https://www.globalsources.com';
  const url = `${base}/search-results?query=${encodeURIComponent(q)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const out: ExternalListing[] = [];
    // Common product card containers on Global Sources (as of 2025-10)
    const cards = $('.card, .product-card, .product-list-item, [data-qa="product-card"]');
    const push = (o: ExternalListing) => { if (out.length < limit) out.push(o); };
    if (cards.length) {
      cards.each((_, el) => {
        if (out.length >= limit) return false;
        const card = $(el);
        const a = card.find('a[href*="/product/"]').first();
        const href = a.attr('href') || '';
        const urlAbs = toAbs(base, href);
        // Title
        const title = (a.attr('title') || card.find('.title, .product-title, h3, h2').first().text() || a.text() || '').replace(/\s+/g, ' ').trim();
        if (!urlAbs || !title) return;
        // Image
        const imgEl = card.find('img').first();
        const imgSrc = imgEl.attr('data-src') || imgEl.attr('data-original') || imgEl.attr('src') || '';
        const image = normalizeImage(base, imgSrc);
        const text = card.text().replace(/\s+/g, ' ').trim();
        const price = parsePrice(text);
        const moq = parseMoq(text);
        const storeName = (card.find('.supplier, .company, .store, .seller-name').first().text() || '').replace(/\s+/g, ' ').trim() || undefined;
        push({ platform: 'GLOBAL_SOURCES', title, image, price, url: urlAbs, moq, storeName });
      });
    }
    if (out.length) return out;
    // Fallback: generic anchors with /product/
    $('a[href*="/product/"]').each((_, el) => {
      if (out.length >= limit) return false;
      const href = ($(el).attr('href') || '').trim();
      const urlAbs = toAbs(base, href);
      const title = (($(el).attr('title') || $(el).text()) as string).replace(/\s+/g, ' ').trim();
      if (!title) return;
      const container = $(el).closest('div,li,article');
      const imgEl = container.find('img').first();
      const imgSrc = imgEl.attr('data-src') || imgEl.attr('data-original') || imgEl.attr('src') || '';
      const image = normalizeImage(base, imgSrc);
      const text = container.text().replace(/\s+/g, ' ').trim();
      const price = parsePrice(text);
      const moq = parseMoq(text);
      const storeName = (container.find('.supplier, .company, .store, .seller-name').first().text() || '').replace(/\s+/g, ' ').trim() || undefined;
      push({ platform: 'GLOBAL_SOURCES', title, image, price, url: urlAbs, moq, storeName });
    });
    return out;
  } catch {
    return [];
  }
}

export default fetchGlobalSources;
