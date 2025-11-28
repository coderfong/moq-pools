import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';

type FetchOptions = { headless?: boolean };

export async function fetchC1688(q: string, limit = 10, opts?: FetchOptions): Promise<ExternalListing[]> {
  if (opts?.headless) {
    const headlessItems = await fetchC1688Headless(q, limit).catch(() => []);
    if (headlessItems.length >= Math.min(limit, 20)) return headlessItems.slice(0, limit);
  }
  // 1688 uses Chinese markup and dynamic content; try mobile and desktop endpoints with basic paging
  const enc = encodeURIComponent(q);
  const desktop = (p: number) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&beginPage=${p}`;
  const mobile = (p: number) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&viewtype=mini&beginPage=${p}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;

  async function parse(html: string, base = 'https://s.1688.com') {
    const $ = cheerio.load(html);
    const items: ExternalListing[] = [];
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
    // Heuristic: find anchors linking to detail.1688.com or offer/ paths
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const isItem = /(?:detail|offer)\.1688\.com|\/offer\//.test(href);
      if (!isItem) return;
      const title = ($(el).attr('title') || $(el).text()).trim();
      if (!title) return;
      const imgEl = $(el).find('img').first();
      let img = imgEl.attr('src') || imgEl.attr('data-src') || '';
      if (!img) {
        const srcset = imgEl.attr('srcset') || '';
        if (srcset) img = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
      }
      const image = normalizeImageUrl(img);
      const txt = $(el).text();
      const price = txt.match(/\d+[\d,.]*\s*(?:USD|RMB|CNY|¥|￥)?/)?.[0] || '';
      const moq = txt.match(/MOQ\s*\d+|起订\s*\d+|≥\s*\d+/)?.[0];
      const absolute = href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `${base}${href}`);
      items.push({ platform: 'C1688', title, image, price, url: absolute, moq });
    });
    return items;
  }

  const acc: ExternalListing[] = [];
  const maxPages = Math.min(20, Math.max(1, Math.ceil(limit / 40)));
  for (let p = 1; p <= maxPages && acc.length < limit; p++) {
    try {
      const res = await fetch(mobile(p), { headers });
      if (res.ok) {
        const html = await res.text();
        acc.push(...await parse(html));
      }
    } catch {}
    if (acc.length >= limit) break;
    try {
      const res = await fetch(desktop(p), { headers });
      if (res.ok) {
        const html = await res.text();
        acc.push(...await parse(html));
      }
    } catch {}
  }

  return acc.slice(0, limit);
}

async function fetchC1688Headless(q: string, limit = 60): Promise<ExternalListing[]> {
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
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y`;
  const items: ExternalListing[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    let idleRounds = 0;
    for (let round = 0; round < 20 && items.length < limit; round++) {
      const batch = await page.evaluate(() => {
        const toAbs = (href: string) => href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `https://s.1688.com${href.startsWith('/') ? '' : '/'}${href}`);
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
        const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const out: any[] = [];
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          if (!/(?:detail|offer)\.1688\.com|\/offer\//.test(href)) continue;
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
          const price = (txt.match(/\d+[\d,.]*\s*(?:USD|RMB|CNY|¥|￥)?/) || [])[0] || '';
          const moq = (txt.match(/MOQ\s*\d+|起订\s*\d+|≥\s*\d+/) || [])[0];
          out.push({ platform: 'C1688', title, image, price, url, moq });
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
