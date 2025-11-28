import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';

export async function fetchC1688(q: string, limit = 10): Promise<ExternalListing[]> {
  // 1688 uses Chinese markup and dynamic content; try mobile and desktop endpoints
  const desktop = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(q)}&n=y`;
  const mobile = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(q)}&n=y&viewtype=mini`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  } as const;

  async function parse(html: string, base = 'https://s.1688.com') {
    const $ = cheerio.load(html);
    const items: ExternalListing[] = [];
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
      const txt = $(el).text();
      const price = txt.match(/\d+[\d,.]*\s*(?:USD|RMB|CNY|¥|￥)?/)?.[0] || '';
      const moq = txt.match(/MOQ\s*\d+|起订\s*\d+|≥\s*\d+/)?.[0];
      const absolute = href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `${base}${href}`);
      items.push({ platform: 'C1688', title, image: img, price, url: absolute, moq });
    });
    return items;
  }

  try {
    const res = await fetch(mobile, { headers });
    if (res.ok) {
      const html = await res.text();
      const items = await parse(html);
      if (items.length) return items.slice(0, limit);
    }
  } catch {}

  try {
    const res = await fetch(desktop, { headers });
    if (res.ok) {
      const html = await res.text();
      const items = await parse(html);
      if (items.length) return items.slice(0, limit);
    }
  } catch {}

  return [];
}
