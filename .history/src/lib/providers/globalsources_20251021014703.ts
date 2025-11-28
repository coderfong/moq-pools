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

function parseHtml(html: string, base: string, limit: number): ExternalListing[] {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
  const push = (o: ExternalListing) => { if (out.length < limit) out.push(o); };

  // Common product card containers on Global Sources (names may vary; broadened)
  const cards = $(
    [
      '.card',
      '.product-card',
      '.product-list-item',
      '[data-qa="product-card"]',
      '.product-item',
      '.ProductCard',
      '.product',
    ].join(', ')
  );
  if (cards.length) {
    cards.each((_, el) => {
      const card = $(el);
      const a = card.find('a[href]').filter((_, a) => /\/product[\/-]/i.test($(a).attr('href') || '')).first();
      const href = a.attr('href') || '';
      const urlAbs = toAbs(base, href);
      const title = (a.attr('title') || card.find('.title, .product-title, h3, h2').first().text() || a.text() || '').replace(/\s+/g, ' ').trim();
      if (!urlAbs || !title) return;
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

  // Fallback: generic anchors containing /product-
  $('a[href]').each((_, el) => {
    if (out.length >= limit) return false;
    const href = ($(el).attr('href') || '').trim();
    if (!/\/product[\/-]/i.test(href)) return;
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
}

async function fetchGlobalSourcesHeadless(urls: string[], limit: number): Promise<ExternalListing[]> {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
    const out: ExternalListing[] = [];
    for (const url of urls) {
      if (out.length >= limit) break;
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // Give client a bit to render cards
        await page.waitForTimeout(1500);
        const html = await page.content();
        const parsed = parseHtml(html, new URL(url).origin, Math.max(20, Math.min(limit, 400)));
        for (const it of parsed) {
          if (out.length >= limit) break;
          // de-dupe by URL
          if (out.some(x => x.url === it.url)) continue;
          out.push(it);
        }
      } catch { /* ignore */ }
      finally { await page.close().catch(() => {}); }
    }
    await browser.close().catch(() => {});
    return out;
  } catch {
    return [];
  }
}

export async function fetchGlobalSources(q: string, limit = 60, opts?: FetchOptions): Promise<ExternalListing[]> {
  const base = 'https://www.globalsources.com';
  const enc = encodeURIComponent(q);
  // Try multiple endpoints to increase hit rate
  const endpoints = [
    `${base}/search-results?query=${enc}`,
    `${base}/wholesale/${enc}.html`,
    `${base}/manufacturers/${enc}.html`,
  ];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': base,
  } as const;

  const out: ExternalListing[] = [];
  for (const url of endpoints) {
    if (out.length >= limit) break;
    try {
      const res = await fetch(url, { headers, cache: 'no-store' as any });
      if (!res.ok) continue;
      const html = await res.text();
      const parsed = parseHtml(html, base, limit);
      for (const it of parsed) {
        if (out.length >= limit) break;
        if (out.some(x => x.url === it.url)) continue;
        out.push(it);
      }
      if (out.length >= Math.max(10, Math.min(80, limit))) break; // good enough from static
    } catch { /* continue */ }
  }

  if (out.length < Math.max(10, Math.min(60, limit)) && (opts?.headless ?? true)) {
    // Promote to headless render for richer pages
    const headless = await fetchGlobalSourcesHeadless(endpoints, limit).catch(() => []);
    for (const it of headless) {
      if (out.length >= limit) break;
      if (out.some(x => x.url === it.url)) continue;
      out.push(it);
    }
  }
  return out.slice(0, limit);
}

export default fetchGlobalSources;
