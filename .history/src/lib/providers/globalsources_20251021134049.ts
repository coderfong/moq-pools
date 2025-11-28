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
    const fs = await import('node:fs/promises');
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

    // Apply cookies to both .com and .com.hk
    const cookieStr = process.env.GS_COOKIES || '';
    if (cookieStr) {
      const parts = cookieStr.split(';').map(s => s.trim()).filter(Boolean);
      const toCookie = (domain: string) => parts.map(kv => {
        const [name, ...rest] = kv.split('=');
        return { name, value: rest.join('='), domain, path: '/', httpOnly: false } as any;
      });
      try { await context.addCookies(toCookie('.globalsources.com')); } catch {}
      try { await context.addCookies(toCookie('.globalsources.com.hk')); } catch {}
    }

    const results: ExternalListing[] = [];
    const maxPages = Math.max(1, Number(process.env.GS_MAX_PAGES || 6));
    const scrollsPerPage = Math.max(2, Number(process.env.GS_SCROLLS_PER_PAGE || 6));
    const scrollDelayMs = Math.max(200, Number(process.env.GS_SCROLL_DELAY_MS || 700));

    for (const targetUrl of urls) {
      if (results.length >= limit) break;
      const page = await context.newPage();
      try {
        page.on('response', (res) => {
          const u = res.url();
          if (u.includes('globalsources') && res.status() >= 400) console.warn('[GS][HTTP]', res.status(), u);
        });
        const extra: Record<string, string> = { 'Accept-Language': 'en-US,en;q=0.9', 'Upgrade-Insecure-Requests': '1' };
        if (cookieStr) extra['Cookie'] = cookieStr;
        await page.setExtraHTTPHeaders(extra);

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
        try { await page.locator('button:has-text("Accept")').first().click({ timeout: 1200 }); } catch {}
        try { await page.locator('button:has-text("I agree")').first().click({ timeout: 1200 }); } catch {}

        for (let p = 1; p <= maxPages && results.length < limit; p++) {
          for (let s = 0; s < scrollsPerPage && results.length < limit; s++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(scrollDelayMs);
          }
          // Try load more buttons
          const loadMoreSel = 'button:has-text("Load more"), button.load-more, a.load-more, button:has-text("More")';
          const loadMore = await page.$(loadMoreSel);
          if (loadMore) {
            try {
              await Promise.all([
                page.waitForLoadState('networkidle', { timeout: 15000 }),
                loadMore.click(),
              ]);
              await page.waitForTimeout(1000);
            } catch {}
          }

          // Parse current document and any same-origin frames
          const frames = [page, ...page.frames()];
          for (const f of frames) {
            try {
              const html = await f.content();
              const origin = (() => { try { return new URL(f.url() || targetUrl).origin; } catch { return new URL(targetUrl).origin; } })();
              const parsed = parseHtml(html, origin, Math.max(20, Math.min(limit, 600)));
              for (const it of parsed) {
                if (results.length >= limit) break;
                if (results.some(x => x.url === it.url)) continue;
                results.push(it);
              }
            } catch {}
          }
          if (results.length >= limit) break;
          // Next page
          const nextSel = 'a[rel="next"], .pagination .next a, .pager-next a, a:has-text("Next"), button:has-text("Next")';
          const nextEl = await page.$(nextSel);
          if (!nextEl) break;
          try {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
              nextEl.click(),
            ]);
            await page.waitForTimeout(600);
          } catch {
            break;
          }
        }

        if (results.length === 0) {
          try {
            await fs.mkdir('tmp', { recursive: true });
            const safe = targetUrl.replace(/[^a-z0-9]+/gi, '_').slice(0, 100);
            await fs.writeFile(`tmp/${safe}.html`, await page.content());
            try { await (page as any).screenshot({ path: `tmp/${safe}.png`, fullPage: true }); } catch {}
            console.warn('[GS] Wrote tmp/%s.(html|png)', safe);
          } catch {}
        }
      } catch {}
      finally { await page.close().catch(() => {}); }
    }

    await browser.close().catch(() => {});
    return results;
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
