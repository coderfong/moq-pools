import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';

async function tryParse(html: string, base = 'https://www.aliexpress.com') {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
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
  const priceTxt = $(el).text();
  const price = priceTxt.match(/\$\s?\d[\d,.]*/)?.[0] || '';
    const absolute = href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `${base}${href}`);
    out.push({ platform: 'ALIEXPRESS', title, image: img, price, url: absolute });
  });
  return out;
}

export async function fetchAliExpress(q: string, limit = 10): Promise<ExternalListing[]> {
  const enc = encodeURIComponent(q);
  // Generate multiple pages for both desktop and mobile endpoints
  const desktopBase = (p: number) => `https://www.aliexpress.com/wholesale?SearchText=${enc}&page=${p}`;
  const mobileBase = (p: number) => `https://m.aliexpress.com/wholesale/wholesaleSearch.htm?searchText=${enc}&page=${p}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;

  const acc: ExternalListing[] = [];
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
