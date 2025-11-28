import * as cheerio from 'cheerio';
import type { ExternalListing, PlatformKey } from './types';

type FetchOptions = { headless?: boolean };

function normalizeUrl(base: string, href = '') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function normalizeImage(src = '', base = 'https://s.taobao.com') {
  let u = (src || '').trim();
  if (!u) return '';
  if (u.includes(',')) {
    const first = u.split(',')[0]?.trim().split(' ')[0];
    if (first) u = first;
  }
  if (u.startsWith('data:')) return '';
  if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
  if (u.startsWith('//')) return `https:${u}`;
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

async function tryParse(html: string, base = 'https://s.taobao.com'): Promise<ExternalListing[]> {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
  // Taobao result pages are dynamic; we heuristically parse anchors that look like item links
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href) return;
    // Accept detail anchors to item.taobao.com or m.item.taobao.com, or alicdn image proxies with detail links
    const isItem = /item\.taobao\.com\//.test(href) || /m\.item\.taobao\.com\//.test(href) || /\/item\.htm\b/.test(href);
    if (!isItem) return;
    const title = (($(el).attr('title') || $(el).text()) as string).replace(/\s+/g, ' ').trim();
    if (!title) return;
    // Image nearby
    const imgEl = $(el).find('img').first();
    let img = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-ks-lazyload') || '';
    if (!img) {
      const srcset = imgEl.attr('srcset') || '';
      if (srcset) img = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
    }
    const image = normalizeImage(img, base);
    const container = $(el).closest('div,li');
    const text = container.text().replace(/\s+/g, ' ').trim();
    const price = (text.match(/(?:¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/) || [])[0] || '';
    const url = normalizeUrl(base, href);
    const storeName = (container.find('.shopname,.shopNick,.seller,.shop').first().text() || '').trim() || undefined;
    const orders = (text.match(/([\d,.]+)\s*(人付款|已售|销量|sold|orders?)/i) || [])[0] || undefined;
  out.push({ platform: 'TAOBAO' as PlatformKey, title, image, price, url, storeName, orders });
  });
  return out;
}

export async function fetchTaobao(q: string, limit = 10, opts?: FetchOptions): Promise<ExternalListing[]> {
  // Prefer non-headless HTML fetch due to bot detection; headless path optional
  if (opts?.headless) {
    const headless = await fetchTaobaoHeadless(q, limit).catch(() => []);
    if (headless.length >= Math.min(limit, 20)) return headless.slice(0, limit);
  }
  const enc = encodeURIComponent(q);
  const endpoints = [
    { url: `https://s.taobao.com/search?q=${enc}`, base: 'https://s.taobao.com' },
    { url: `https://s.taobao.com/search?q=${enc}&tab=mall`, base: 'https://s.taobao.com' },
    { url: `https://m.taobao.com/search?q=${enc}`, base: 'https://m.taobao.com' },
  ];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;
  const acc: ExternalListing[] = [];
  for (const ep of endpoints) {
    if (acc.length >= limit) break;
    try {
      const res = await fetch(ep.url, { headers });
      if (!res.ok) continue;
      const html = await res.text();
      acc.push(...await tryParse(html, ep.base));
      if (acc.length >= limit) break;
    } catch {}
  }
  return acc.slice(0, limit);
}

async function fetchTaobaoHeadless(q: string, limit = 60): Promise<ExternalListing[]> {
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch { return []; }
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  const enc = encodeURIComponent(q);
  const url = `https://s.taobao.com/search?q=${enc}`;
  const items: ExternalListing[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    let idle = 0;
    for (let round = 0; round < 20 && items.length < limit; round++) {
      const batch = await page.evaluate(() => {
        const toAbs = (href: string) => href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `https://s.taobao.com${href.startsWith('/') ? '' : '/'}${href}`);
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
        const anchors = Array.from(document.querySelectorAll('a[href*="item.taobao.com"], a[href*="/item.htm"], a[href*="m.item.taobao.com"]')) as HTMLAnchorElement[];
        const out: any[] = [];
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const img = (a.querySelector('img') as HTMLImageElement | null);
          let image = img?.getAttribute('src') || img?.getAttribute('data-src') || img?.getAttribute('data-ks-lazyload') || '';
          if (!image) {
            const ss = img?.getAttribute('srcset') || '';
            if (ss) image = ss.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
          }
          const container = a.closest('div,li') as HTMLElement | null;
          const text = clean(container?.innerText || '');
          const price = (text.match(/(?:¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?/) || [])[0] || '';
          const orders = (text.match(/([\d,.]+)\s*(人付款|已售|销量|sold|orders?)/i) || [])[0] || undefined;
          const storeEl = container?.querySelector('.shopname,.shopNick,.seller,.shop') as HTMLElement | null;
          const storeName = storeEl?.innerText?.trim() || undefined;
          out.push({ platform: 'TAOBAO' as PlatformKey, title, image, price, url, orders, storeName });
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
      await page.waitForTimeout(1200);
      if (items.length === before) idle++; else idle = 0;
      if (idle >= 3) break;
    }
  } catch {}
  await ctx.close();
  await browser.close();
  return items.slice(0, limit);
}
