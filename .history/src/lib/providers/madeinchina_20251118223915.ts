import * as cheerio from 'cheerio';
import type { ExternalListing, PlatformKey } from './types';

type FetchOptions = { headless?: boolean; upgradeImages?: boolean; detailTimeoutMs?: number };

function normalizeUrl(base: string, href = '') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function normalizeImage(src = '', base = 'https://www.made-in-china.com') {
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

async function tryParse(html: string, base = 'https://www.made-in-china.com'): Promise<ExternalListing[]> {
  const $ = cheerio.load(html);
  const out: ExternalListing[] = [];
  const isMicPlaceholder = (u: string) => {
    try {
      const x = normalizeImage(u, base);
      const url = new URL(x);
      return url.hostname.includes('micstatic.com') && /\/common\/img\/space\.png$/i.test(url.pathname);
    } catch { return false; }
  };
  // Common card/container selectors on Made-in-China
  const cards = $('.products-item, .prd-list, .product-item, .prd-item, .list-item, .result-item, .pro-item, li[data-title]');
  if (cards.length) {
    cards.each((_, el) => {
      const card = $(el);
      const a = card.find('a[href]').filter((_, a) => /\/product\//i.test($(a).attr('href') || '')).first();
      const href = a.attr('href') || '';
      
      // Try multiple title extraction methods - prefer data-title attribute first
      let title = card.attr('data-title') || '';
      if (!title) {
        // Try getting from h2, .product-name, or link title
        title = card.find('.product-name').first().text() || 
                card.find('h2').first().text() || 
                card.find('h3').first().text() || 
                a.attr('title') || 
                a.text() || '';
      }
      title = title.replace(/\s+/g, ' ').trim();
      
      if (!href || !title) return;
      const url = normalizeUrl(base, href);
      
      // Image - try data-original, data-src, alt attribute for better image, then src
      const imgEl = card.find('img').first();
      let img = imgEl.attr('data-original') || imgEl.attr('data-src') || '';
      
      // If no data-* attributes, use alt to construct better image URL (Made-in-China pattern)
      if (!img) {
        const alt = imgEl.attr('alt') || '';
        if (alt) {
          // Made-in-China often has the image slug in the alt text
          const slug = alt.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
          // Try to extract from the URL or use alt-based guess
          const urlMatch = href.match(/\/product\/([^/]+)\//);
          if (urlMatch) {
            img = `https://image.made-in-china.com/${urlMatch[1]}-${slug}.webp`;
          }
        }
      }
      
      // Fallback to src if we still don't have an image
      if (!img) {
        img = imgEl.attr('src') || '';
      }
      
      // Try srcset as last resort
      if (!img) {
        const srcset = imgEl.attr('srcset') || '';
        if (srcset) img = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
      }
      
      let image = normalizeImage(img, base);
      if (isMicPlaceholder(image)) image = '';
      
      const text = card.text().replace(/\s+/g, ' ').trim();
      // Prices like US$ 1.20-3.50 / Piece
      const price = (text.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/) || [])[0] || '';
      const moq = (text.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*[\d,]+/i) || [])[0] || undefined;
      const storeName = (card.find('.company-name,.supplier,.s-company').first().text() || '').replace(/\s+/g, ' ').trim() || undefined;
  out.push({ platform: 'MADE_IN_CHINA', title, image, price, url, moq, storeName } as ExternalListing);
    });
  }
  if (out.length) return out;
  // Fallback: generic anchor scan
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!/\/product\//i.test(href)) return;
    const title = (($(el).attr('title') || $(el).text()) as string).replace(/\s+/g, ' ').trim();
    if (!title) return;
    const url = normalizeUrl(base, href);
    const container = $(el).closest('div,li');
  const imgEl = container.find('img').first();
  let img = imgEl.attr('data-original') || imgEl.attr('data-src') || imgEl.attr('src') || '';
  let image = normalizeImage(img, base);
  if (isMicPlaceholder(image)) image = '';
    const text = container.text().replace(/\s+/g, ' ').trim();
    const price = (text.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/) || [])[0] || '';
    const moq = (text.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*[\d,]+/i) || [])[0] || undefined;
    const storeName = (container.find('.company-name,.supplier,.s-company').first().text() || '').replace(/\s+/g, ' ').trim() || undefined;
  out.push({ platform: 'MADE_IN_CHINA', title, image, price, url, moq, storeName } as ExternalListing);
  });
  return out;
}

// Extract the second gallery image from a Made-in-China product detail page.
// It prefers the <ul class="sr-proMainInfo-slide-pageUl sroll J-proSlide-content"> list and picks
// the 2nd <li class="J-pic-dot"> image, skipping any that look like video placeholders (e.g., "-mp4.webp").
export async function getMadeInChinaDetailSecondImage(detailUrl: string): Promise<string> {
  const base = 'https://www.made-in-china.com';
  const normalize = (u: string) => {
    let x = (u || '').trim();
    if (!x) return '';
    if (x.startsWith('//')) x = `https:${x}`;
    if (!/^https?:\/\//i.test(x)) x = `${base}${x.startsWith('/') ? '' : '/'}${x}`;
    return x.replace(/^http:\/\//i, 'https://');
  };
  // Consider any thumbnail referring to an mp4 (often mp4.webp) or marked by a video overlay as video
  const looksLikeVideo = (u: string) => /(?:^|[\/_-])mp4(?:\.(?:webp|jpe?g|png))?\b/i.test(u) || /video/i.test(u);
  try {
    const res = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
  type Entry = { url: string; video: boolean };
  const imgs: string[] = [];
  const valid: string[] = [];
  const entries: Entry[] = [];
    // Primary gallery (broadened: some pages omit additional classes like 'sroll J-proSlide-content')
    const galleryLis = $('ul.sr-proMainInfo-slide-pageUl li.J-pic-dot');
    if (galleryLis.length) {
      galleryLis.each((_, li) => {
        const liEl = $(li);
        const imgEl = liEl.find('img').first();
        const src = (imgEl.attr('data-original') || imgEl.attr('data-src') || imgEl.attr('src') || '').trim();
        const hasVideoOverlay = !!liEl.find('a.img-video, .img-video, .J-dot-play').length;
        if (src) {
          const abs = normalize(src);
          const isVid = looksLikeVideo(abs) || hasVideoOverlay;
          imgs.push(abs);
          entries.push({ url: abs, video: isVid });
          if (!isVid) valid.push(abs);
        }
      });
    }
    // If primary selector found nothing, try the more specific legacy selector
    if (!imgs.length) {
      $('ul.sr-proMainInfo-slide-pageUl.sroll.J-proSlide-content li.J-pic-dot img').each((_, el) => {
        const src = ($(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('src') || '').trim();
        if (src) {
          const abs = normalize(src);
          imgs.push(abs);
          if (!looksLikeVideo(abs)) valid.push(abs);
        }
      });
    }
    // Fallbacks
    if (!imgs.length) {
      $('.sr-proMainInfo-slide-pageInside img, .J-proSlide-content img').each((_, el) => {
        const src = ($(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('src') || '').trim();
        if (src) {
          const abs = normalize(src);
          imgs.push(abs);
          if (!looksLikeVideo(abs)) valid.push(abs);
        }
      });
    }
    if (imgs.length || valid.length) {
      // Prefer the SECOND item from the gallery (index 1), if it's not a video
      let pick = '';
      if (entries.length > 1) {
        const e = entries[1];
        if (e && !e.video) pick = e.url;
      }
      // If index 1 is missing or a video, walk forward from index 1 to find next non-video
      if (!pick && entries.length) {
        for (let i = 1; i < entries.length; i++) {
          const e = entries[i];
          if (e && !e.video) { pick = e.url; break; }
        }
      }
      // As a last resort, first non-video anywhere
      if (!pick) pick = valid[0] || imgs.find(u => !!u && !looksLikeVideo(u)) || '';
      return pick || '';
    }
    // Meta tags as last resort
    const meta = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') || ''
    );
    return normalize(meta);
  } catch {
    return '';
  }
}

export async function fetchMadeInChina(q: string, limit = 10, opts?: FetchOptions): Promise<ExternalListing[]> {
  // Headless optional; often not required
  if (opts?.headless) {
    const headless = await fetchMadeInChinaHeadless(q, limit).catch(() => []);
    if (headless.length >= Math.min(limit, 20)) return headless.slice(0, limit);
  }
  const enc = encodeURIComponent(q);
  const endpoints = [
    { url: `https://www.made-in-china.com/products-search/hot-china-products/${enc}.html`, base: 'https://www.made-in-china.com' },
    { url: `https://www.made-in-china.com/productdirectory.do?word=${enc}`, base: 'https://www.made-in-china.com' },
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
    } catch {}
  }
  const items = acc.slice(0, limit);
  // Optional post-process upgrade to detail-gallery image (disabled by default for performance)
  if (opts?.upgradeImages) {
    const concurrency = 4;
    const timeout = Math.max(500, Math.min(8000, opts?.detailTimeoutMs ?? 2500));
    let idx = 0;
    const withTimeout = <T>(p: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('timeout')), timeout);
      p.then((v) => { clearTimeout(to); resolve(v); }, (e) => { clearTimeout(to); reject(e); });
    });
    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const it = items[i];
        if (!it?.url) continue;
        try {
          const best = await withTimeout(getMadeInChinaDetailSecondImage(it.url));
          if (best) it.image = best;
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  }
  return items;
}

async function fetchMadeInChinaHeadless(q: string, limit = 60): Promise<ExternalListing[]> {
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch { return []; }
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  const enc = encodeURIComponent(q);
  const url = `https://www.made-in-china.com/products-search/hot-china-products/${enc}.html`;
  const items: ExternalListing[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    let idle = 0;
    for (let round = 0; round < 16 && items.length < limit; round++) {
      const batch = await page.evaluate(() => {
        const toAbs = (href: string) => href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `https://www.made-in-china.com${href.startsWith('/') ? '' : '/'}${href}`);
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
        const cards = Array.from(document.querySelectorAll('.prd-list, .product-item, .prd-item, .list-item, .result-item, .pro-item')) as HTMLElement[];
        const out: any[] = [];
        for (const card of cards) {
          const a = card.querySelector('a[href*="/product/"]') as HTMLAnchorElement | null;
          if (!a) continue;
          const href = a.getAttribute('href') || '';
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const img = card.querySelector('img') as HTMLImageElement | null;
          let image = img?.getAttribute('src') || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '';
          const txt = clean(card.innerText || '');
          const price = (txt.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/) || [])[0] || '';
          const moq = (txt.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥)\s*[\d,]+/i) || [])[0] || undefined;
          const storeEl = card.querySelector('.company-name,.supplier,.s-company') as HTMLElement | null;
          const storeName = storeEl?.innerText?.trim() || undefined;
          out.push({ platform: 'MADE_IN_CHINA', title, image, price, url, moq, storeName } as ExternalListing);
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
      if (items.length === before) idle++; else idle = 0;
      if (idle >= 3) break;
    }
  } catch {}
  await ctx.close();
  await browser.close();
  return items.slice(0, limit);
}
