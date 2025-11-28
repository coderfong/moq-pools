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

async function fetchGlobalSourcesHeadless(urls: string[], limit: number, headless = true): Promise<ExternalListing[]> {
  try {
    const { chromium } = await import('playwright');
    const proxyServer = process.env.GS_PROXY || process.env.HTTP_PROXY || process.env.http_proxy || '';
    const launchOpts: Parameters<typeof chromium.launch>[0] = { headless };
    if (proxyServer) (launchOpts as any).proxy = { server: proxyServer };
    const browser = await chromium.launch(launchOpts);
    const context = await browser.newContext({
      viewport: { width: 1360, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Asia/Hong_Kong',
    });
    const cookieStr = process.env.GS_COOKIES || '';
    if (cookieStr) {
      const cookies = cookieStr.split(';').map(s => s.trim()).filter(Boolean).map((kv) => {
        const [name, ...rest] = kv.split('=');
        return { name, value: rest.join('='), domain: '.globalsources.com', path: '/', httpOnly: false } as any;
      });
      try { await context.addCookies(cookies); } catch {}
    }
    const out: ExternalListing[] = [];

    const maxPages = Math.max(1, Math.min(50, Number(process.env.GS_MAX_PAGES || '10')));
    const scrolls = Math.max(4, Math.min(60, Number(process.env.GS_SCROLLS || '16')));
    const waitMs = Math.max(200, Math.min(4000, Number(process.env.GS_WAIT || '400')));
    const tryLoadMore = Math.max(0, Math.min(40, Number(process.env.GS_LOAD_MORE || '10')));

    async function processUrl(pageUrl: string) {
      const page = await context.newPage();
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        try { await page.locator('button:has-text("Accept")').first().click({ timeout: 1500 }); } catch {}
        try { await page.locator('button:has-text("I agree")').first().click({ timeout: 1500 }); } catch {}
        let pagesDone = 0;
        let lastCount = out.length;
        for (; pagesDone < maxPages && out.length < limit; pagesDone++) {
          // Attempt to click load more several times before paging
          for (let k = 0; k < tryLoadMore; k++) {
            const clicked = await page.locator('button:has-text("Load more"), .load-more, a.load-more, button:has-text("More")').first().isVisible()
              .then(v => v ? page.locator('button:has-text("Load more"), .load-more, a.load-more, button:has-text("More")').first().click().then(() => true).catch(() => false) : false)
              .catch(() => false);
            if (!clicked) break;
            await page.waitForTimeout(waitMs + 300);
          }

          for (let i = 0; i < scrolls && out.length < limit; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(waitMs);
          }
          try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
          const html = await page.content();
          const parsed = parseHtml(html, new URL(page.url()).origin, Math.max(20, Math.min(limit, 1000)));
          for (const it of parsed) {
            if (out.length >= limit) break;
            if (out.some(x => x.url === it.url)) continue;
            out.push(it);
          }
          // If we didn't get any new items, attempt to go to next page
          if (out.length >= limit) break;
          const nowCount = out.length;
          if (nowCount > lastCount) {
            lastCount = nowCount;
          }
          // Next page selectors
          const nextLoc = page.locator('a[aria-label="Next"], .pagination .next a, .pager-next a, a:has-text("Next"), button:has-text("Next")').first();
          if (await nextLoc.count()) {
            try {
              const href = await nextLoc.getAttribute('href');
              if (href && href.trim().length > 0) {
                const abs = href.startsWith('http') ? href : new URL(href, page.url()).toString();
                await page.goto(abs, { waitUntil: 'domcontentloaded', timeout: 30000 });
                continue;
              }
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                nextLoc.click({ timeout: 3000 }).catch(() => {}),
              ]);
            } catch {}
          } else {
            break;
          }
        }
      } catch { /* ignore */ }
      finally { await page.close().catch(() => {}); }
    }

    for (const url of urls) {
      if (out.length >= limit) break;
      await processUrl(url);
    }

    // Mobile fallback context if still too few
    if (out.length < Math.max(20, Math.min(80, limit))) {
      const mctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
        locale: 'en-US',
        timezoneId: 'Asia/Hong_Kong',
      });
      if (cookieStr) {
        const cookies = cookieStr.split(';').map(s => s.trim()).filter(Boolean).map((kv) => {
          const [name, ...rest] = kv.split('=');
          return { name, value: rest.join('='), domain: '.globalsources.com', path: '/', httpOnly: false } as any;
        });
        try { await mctx.addCookies(cookies); } catch {}
      }
      const mpage = await mctx.newPage();
      try {
        for (const url of urls) {
          if (out.length >= limit) break;
          await mpage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          for (let i = 0; i < scrolls; i++) { await mpage.evaluate(() => window.scrollBy(0, 1200)); await mpage.waitForTimeout(waitMs); }
          const html = await mpage.content();
          const parsed = parseHtml(html, new URL(url).origin, Math.max(20, Math.min(limit, 1000)));
          for (const it of parsed) {
            if (out.length >= limit) break;
            if (out.some(x => x.url === it.url)) continue;
            out.push(it);
          }
        }
      } catch { /* ignore */ }
      finally { await mpage.close().catch(() => {}); await mctx.close().catch(() => {}); }
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
  // Build multiple endpoints with light pagination to increase hit rate
  const endpointsBase = [
    `${base}/search-results?query=${enc}`,
    `${base}/wholesale/${enc}.html`,
    `${base}/manufacturers/${enc}.html`,
  ];
  const mbase = 'https://m.globalsources.com';
  const mobileEndpointsBase = [
    `${mbase}/products?query=${enc}`,
    `${mbase}/search?query=${enc}`,
  ];
  const pageParams = [1, 2, 3, 4, 5];
  const addPages = (u: string) => {
    const out: string[] = [u];
    for (const p of pageParams.slice(1)) {
      // Try a few common param names
      if (u.includes('?')) {
        out.push(`${u}&page=${p}`);
        out.push(`${u}&p=${p}`);
      } else {
        out.push(`${u}?page=${p}`);
        out.push(`${u}?p=${p}`);
      }
    }
    return out;
  };
  const endpoints = endpointsBase.flatMap(addPages);
  const mobileEndpoints = mobileEndpointsBase.flatMap(addPages);
  const cookieStr = process.env.GS_COOKIES || '';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': base,
    ...(cookieStr ? { 'Cookie': cookieStr } : {}),
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
      if (out.length >= Math.max(10, Math.min(80, limit))) break; // good enough from static desktop
    } catch { /* continue */ }
  }

  // Try static mobile endpoints if desktop yielded little
  if (out.length < Math.max(10, Math.min(60, limit))) {
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
    // Promote to headless render for richer pages
    // If cookies provided, inject into context via env within fetchGlobalSourcesHeadless
    const headlessRes = await fetchGlobalSourcesHeadless([...endpoints, ...mobileEndpoints], limit, opts?.headless).catch(() => []);
    for (const it of headlessRes) {
      if (out.length >= limit) break;
      if (out.some(x => x.url === it.url)) continue;
      out.push(it);
    }
  }
  return out.slice(0, limit);
}

export default fetchGlobalSources;
