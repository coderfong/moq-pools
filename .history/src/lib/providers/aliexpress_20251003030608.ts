// AliExpress provider removed
export {};
import * as cheerio from 'cheerio';
// Deprecated: keeping for reference only
import type { ExternalListing } from './types';

type FetchOptions = { headless?: boolean };

async function tryParse(html: string, base = 'https://www.aliexpress.com') {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
  const normalizeImageUrl = (src = '') => {
    if (!src) return '';
    let u = src.trim();
    if (u.includes(',')) {
      const first = u.split(',')[0]?.trim().split(' ')[0];
      if (first) u = first;
    }
    if (u.startsWith('data:')) return '';
    if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
    if (u.startsWith('//')) return `https:${u}`;
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
  };
  // Generic anchor scan
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href) return;
    const isItem = /aliexpress\.com\/(?:item|i)\//.test(href) || /\/item\//.test(href);
    if (!isItem) return;
    const title = ($(el).attr('title') || $(el).text()).trim();
    if (!title) return;
    const imgEl = $(el).find('img').first();
    let img = imgEl.attr('src') || imgEl.attr('image-src') || imgEl.attr('data-src') || imgEl.attr('data-image') || '';
    if (!img) {
      const srcset = imgEl.attr('srcset') || '';
      if (srcset) img = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
    }
    const image = normalizeImageUrl(img);
    const priceTxt = $(el).text();
    const price = priceTxt.match(/\$\s?\d[\d,.]*/)?.[0] || '';
    // Try to capture sold count like "123 sold" or "123 Orders"
    const orders = (priceTxt.match(/\b([\d,.]+)\s*(sold|orders?)\b/i) || [])[0] || undefined;
    // Heuristic store name: look for nearby text snippets like "Store" or tail of anchor before price
    let storeName: string | undefined;
    const near = $(el).closest('li,div').text().replace(/\s+/g, ' ').trim();
    const mStore = near.match(/([A-Za-z0-9\-\s]{3,50})(?:\s+Official)?\s+Store/i);
    if (mStore) storeName = mStore[0].replace(/\s+Store/i, '').trim();
    const absolute = href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `${base}${href}`);
    // Deprecated provider: keep for history; cast platform to any to avoid type errors
    out.push({ platform: 'ALIEXPRESS' as any, title, image, price, url: absolute, orders, storeName } as any);
  });
  return out;
}

export async function fetchAliExpress(q: string, limit = 10, opts?: FetchOptions): Promise<any[]> {
  if (opts?.headless) {
    const headlessItems = await fetchAliExpressHeadless(q, limit).catch(() => []);
    if (headlessItems.length >= Math.min(limit, 20)) return headlessItems.slice(0, limit);
  }
  const enc = encodeURIComponent(q);
  // Generate multiple pages for both desktop and mobile endpoints
  const desktopBase = (p: number) => `https://www.aliexpress.com/wholesale?SearchText=${enc}&page=${p}`;
  const mobileBase = (p: number) => `https://m.aliexpress.com/wholesale/wholesaleSearch.htm?searchText=${enc}&page=${p}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;

  const acc: any[] = [];
  const maxPages = Math.min(20, Math.max(1, Math.ceil(limit / 40)));
  for (let p = 1; p <= maxPages && acc.length < limit; p++) {
    try {
      const res = await fetch(mobileBase(p), { headers });
      if (res.ok) {
        const html = await res.text();
        acc.push(...await tryParse(html, 'https://m.aliexpress.com'));
      }
    } catch {}
    try {
      const res = await fetch(desktopBase(p), { headers });
      if (res.ok) {
        const html = await res.text();
        acc.push(...await tryParse(html, 'https://www.aliexpress.com'));
      }
    } catch {}
  }
  return acc.slice(0, limit);
}

async function fetchAliExpressHeadless(q: string, limit = 60): Promise<any[]> {
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch {
    return [];
  }
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  const enc = encodeURIComponent(q);
  const url = `https://www.aliexpress.com/wholesale?SearchText=${enc}`;
  const items: any[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    let idleRounds = 0;
    for (let round = 0; round < 20 && items.length < limit; round++) {
      const batch = await page.evaluate(() => {
        const toAbs = (href: string) => href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `https://www.aliexpress.com${href.startsWith('/') ? '' : '/'}${href}`);
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
  const cards = Array.from(document.querySelectorAll('a[href*="/item/"] , a[href*="/i/"]')) as HTMLAnchorElement[];
        const out: any[] = [];
        for (const a of cards) {
          const href = a.getAttribute('href') || '';
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const imgEl = a.querySelector('img') as HTMLImageElement | null;
          let image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
          if (!image) {
            const srcset = imgEl?.getAttribute('srcset') || '';
            if (srcset) image = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
          }
          const txt = clean(a.innerText || '');
          const price = (txt.match(/\$\s?\d[\d,.]*/) || [])[0] || '';
          const orders = (txt.match(/\b([\d,.]+)\s*(sold|orders?)\b/i) || [])[0] || undefined;
          // Try locating a nearby store name
          let storeName: string | undefined;
          try {
            const container = a.closest('li,div');
            const near = clean(container?.textContent || '');
            const mStore = near.match(/([A-Za-z0-9\-\s]{3,50})(?:\s+Official)?\s+Store/i);
            if (mStore) storeName = mStore[0].replace(/\s+Store/i, '').trim();
          } catch {}
          out.push({ platform: 'ALIEXPRESS' as any, title, image, price, url, orders, storeName } as any);
        }
        return out;
      });
      for (const it of batch as any[]) {
        try {
          const key = it.url ? new URL(it.url).origin + new URL(it.url).pathname : '';
          if (key && !seen.has(key)) { seen.add(key); items.push(it); }
        } catch {}
      }
      const before = items.length;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      if (items.length === before) idleRounds++; else idleRounds = 0;
      if (idleRounds >= 3) break;
    }
  } finally {
    await ctx.close();
    await browser.close();
  }
  return items.slice(0, limit);
}
