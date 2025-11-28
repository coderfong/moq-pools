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
      '.gs-product-card',
      '.search-result-item',
      '.result-item',
      '.list-item',
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

  // Fallback: generic anchors containing product-like paths
  $('a[href]').each((_, el) => {
    if (out.length >= limit) return false;
    const href = ($(el).attr('href') || '').trim();
    if (!(/\/product[\/-]/i.test(href) || /\/prod[\/-]/i.test(href) || /\/(p|prod|product)\//i.test(href))) return;
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

// --- Headless hardened flow (behave like a user; no param pagination) ---
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
function cookieHeader() { return process.env.GS_COOKIES || ''; }

async function makeGsContext(headless: boolean) {
  // Dynamic import to avoid hard dep when not needed
  const { chromium } = await import('playwright');
  const proxyServer = process.env.GS_PROXY || process.env.HTTP_PROXY || process.env.http_proxy;
  const browser = await chromium.launch({ headless, proxy: proxyServer ? { server: proxyServer } : undefined });
  const storageState = process.env.GS_STORAGE_STATE;
  const context = await browser.newContext({
    ...(storageState ? { storageState } : {} as any),
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    userAgent: UA,
    viewport: { width: 1366, height: 900 },
  });

  // Apply cookies for multiple domains (.com and .com.hk)
  const cookieStr = cookieHeader();
  if (cookieStr) {
    const pairs = cookieStr.split(';').map(s => s.trim()).filter(Boolean);
    const toCookieObj = (domain: string) =>
      pairs.map(kv => {
        const idx = kv.indexOf('=');
        const name = idx > -1 ? kv.slice(0, idx) : kv;
        const value = idx > -1 ? kv.slice(idx + 1) : '';
        return { name, value, domain, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' as const };
      });
    try { await context.addCookies(toCookieObj('.globalsources.com')); } catch {}
    try { await context.addCookies(toCookieObj('.globalsources.com.hk')); } catch {}
    try { await context.addCookies(toCookieObj('www.globalsources.com')); } catch {}
  }

  const page = await context.newPage();

  // Add headers to every request and optionally block heavy assets
  const cookieStr2 = cookieStr;
  await page.route('**/*', async (route) => {
    try {
      const req = route.request();
      const url = req.url();
      // Block heavy assets (images, fonts, media)
      if (/\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|mp4|webm|avi)(?:\?|$)/i.test(url)) {
        return route.abort();
      }
      const headers = { ...req.headers(), 'Accept-Language': 'en-US,en;q=0.9' } as Record<string, string>;
      if (cookieStr2) headers['cookie'] = cookieStr2; // lower-case key accepted
      await route.continue({ headers });
    } catch {
      try { await route.continue(); } catch {}
    }
  });

  // Also set default extra headers
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Upgrade-Insecure-Requests': '1', ...(cookieStr ? { Cookie: cookieStr } : {}) });

  return { browser, context, page };
}

async function gotoSearch(page: any, base: string, query: string) {
  await page.goto(base, { waitUntil: 'domcontentloaded', referer: base, timeout: 90000 });
  const url = `${base}/search-results?query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', referer: base, timeout: 90000 });
}

async function lazyScroll(pageOrFrame: any, times = Number(process.env.GS_SCROLLS_PER_PAGE || 8), delay = Number(process.env.GS_SCROLL_DELAY_MS || 700)) {
  const t = Math.max(1, times);
  const d = Math.max(100, delay);
  for (let i = 0; i < t; i++) {
    try { await pageOrFrame.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); } catch {}
    await pageOrFrame.waitForTimeout(d);
  }
}

async function clickLoadMoreOrNext(page: any) {
  const selLoadMore = 'button:has-text("Load more"), button.load-more, a.load-more';
  const selNext = 'a[rel="next"], button:has-text("Next"), a:has-text("Next"), .pagination .next a';
  if (await page.$(selLoadMore)) {
    try {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 45000 }),
        page.click(selLoadMore),
      ]);
      return true;
    } catch {}
  }
  const nextEl = await page.$(selNext);
  if (nextEl) {
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 90000 }),
        nextEl.click(),
      ]);
      return true;
    } catch {}
  }
  return false;
}

async function fetchGlobalSourcesHeadless(urls: string[], limit: number, headless = true): Promise<ExternalListing[]> {
  try {
    const fs = await import('node:fs/promises');
    const results: ExternalListing[] = [];
    const { browser, page } = await makeGsContext(headless);
    try {
      // Try .com, then .com.hk if sparse or blocked
      const preferHk = String(process.env.GS_HOST || '').toLowerCase().includes('hk');
      const bases = preferHk
        ? ['https://www.globalsources.com.hk', 'https://www.globalsources.com']
        : ['https://www.globalsources.com', 'https://www.globalsources.com.hk'];
      const maxPages = Math.max(1, Number(process.env.GS_MAX_PAGES || 8));
      for (const base of bases) {
        // Reset page listeners between attempts
        page.removeAllListeners('response');
        page.on('response', (res: any) => {
          const u = res.url();
          const st = res.status();
          if (u.includes('globalsources') && st >= 400) console.warn('[GS][HTTP]', st, u);
        });

        {
          const firstUrl = urls[0] || `${base}/search-results?query=`;
          let qParam = '';
          try {
            const u = new URL(firstUrl, base);
            qParam = decodeURIComponent(u.searchParams.get('query') || u.searchParams.get('keyWord') || '');
          } catch {}
          await gotoSearch(page, base, qParam);
        }
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
        try { await page.locator('button:has-text("Accept")').first().click({ timeout: 1500 }); } catch {}
        try { await page.locator('button:has-text("I agree")').first().click({ timeout: 1500 }); } catch {}

        for (let p = 1; p <= maxPages && results.length < limit; p++) {
          await lazyScroll(page);
          // Parse current doc and frames
          const frames: any[] = [page, ...page.frames()];
          for (const f of frames) {
            try {
              if (f !== page && !String(f.url() || '').includes('globalsources')) continue;
              const html = await f.content();
              const origin = (() => { try { return new URL(f.url() || base).origin; } catch { return new URL(base).origin; } })();
              const parsed = parseHtml(html, origin, Math.max(20, Math.min(limit, 600)));
              for (const it of parsed) {
                if (results.length >= limit) break;
                if (results.some(x => x.url === it.url)) continue;
                results.push(it);
              }
            } catch {}
          }
          if (results.length >= limit) break;
          const moved = await clickLoadMoreOrNext(page);
          if (!moved) break;
          await page.waitForTimeout(400 + Math.floor(Math.random() * 500));
        }
        if (results.length > 0) break; // success on this base
      }

      if (results.length === 0) {
        try {
          await fs.mkdir('tmp', { recursive: true });
          const safe = `gs_${Date.now()}`;
          await fs.writeFile(`tmp/${safe}.html`, await page.content());
          try { await (page as any).screenshot({ path: `tmp/${safe}.png`, fullPage: true }); } catch {}
          console.warn('[GS] Wrote tmp/%s.(html|png)', safe);
        } catch {}
      }
    } finally {
      try { await page.context().browser()?.close(); } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

export async function fetchGlobalSources(q: string, limit = 60, opts?: FetchOptions): Promise<ExternalListing[]> {
  const base = (String(process.env.GS_HOST || '').toLowerCase().includes('hk')
    ? 'https://www.globalsources.com.hk'
    : 'https://www.globalsources.com');
  const enc = encodeURIComponent(q);
  // Only first-page endpoints; avoid param-based pagination that triggers WAF
  const endpoints = [
    `${base}/search-results?query=${enc}`,
    `${base}/searchList/products?keyWord=${enc}&pageNum=1`,
    `${base}/wholesale/${enc}.html`,
    `${base}/manufacturers/${enc}.html`,
  ];
  const mbase = 'https://m.globalsources.com';
  const mobileEndpoints = [
    `${mbase}/products?query=${enc}`,
    `${mbase}/search?query=${enc}`,
  ];
  const cookieStr = process.env.GS_COOKIES || '';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': base,
    ...(cookieStr ? { 'Cookie': cookieStr } : {}),
  } as const;

  const out: ExternalListing[] = [];
  const DISABLE_STATIC = process.env.GS_DISABLE_STATIC === '1';
  if (!DISABLE_STATIC) {
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
        if (out.length >= Math.max(10, Math.min(80, limit))) break; // good enough from static desktop
      } catch { /* continue */ }
    }
  }

  // Try static mobile endpoints if desktop yielded little
  if (!DISABLE_STATIC && out.length < Math.max(10, Math.min(60, limit))) {
    for (const url of mobileEndpoints) {
      if (out.length >= limit) break;
      try {
        const res = await fetch(url, { headers, cache: 'no-store' as any });
        if (!res.ok) continue;
        const html = await res.text();
        const parsed = parseHtml(html, mbase, limit);
        for (const it of parsed) {
          if (out.length >= limit) break;
          if (out.some(x => x.url === it.url)) continue;
          out.push(it);
        }
        if (out.length >= Math.max(10, Math.min(80, limit))) break; // good enough from static mobile
      } catch { /* continue */ }
    }
  }

  if (out.length < Math.max(10, Math.min(60, limit)) && (opts?.headless ?? true)) {
    // Headless user-like navigation (homepage -> search -> click-based pagination)
    const headlessRes = await fetchGlobalSourcesHeadless([`${base}/search-results?query=${enc}`], limit, opts?.headless).catch(() => []);
    for (const it of headlessRes) {
      if (out.length >= limit) break;
      if (out.some(x => x.url === it.url)) continue;
      out.push(it);
    }
  }
  return out.slice(0, limit);
}

export default fetchGlobalSources;
