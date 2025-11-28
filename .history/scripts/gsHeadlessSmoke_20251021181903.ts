import { chromium } from 'playwright';
import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HOST = (process.env.GS_HOST || 'com').includes('hk') ? 'com.hk' : 'com';
const BASE = `https://www.globalsources.${HOST}`;
const COOKIES = (process.env.GS_COOKIES || '').trim();
const OUT = 'tmp';
fs.mkdirSync(OUT, { recursive: true });

function parseCookieHeader(cookieStr: string, domain: string) {
  return cookieStr
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(kv => {
      const i = kv.indexOf('=');
      const name = i > -1 ? kv.slice(0, i) : kv;
      const value = i > -1 ? kv.slice(i + 1) : '';
      return { name, value, domain, path: '/', sameSite: 'Lax' as const, secure: true };
    });
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9_.-]+/gi, '_');
}

async function main() {
  const q = process.argv.slice(2).join(' ') || 'earbuds';
  const url = `${BASE}/search-results?query=${encodeURIComponent(q)}`;

  const headlessEnv = (process.env.HEADLESS ?? '1') !== '0';
  const browser = await chromium.launch({
    headless: headlessEnv,
    proxy: process.env.GS_PROXY ? { server: process.env.GS_PROXY } : undefined,
  });

  const ctxOpts: Parameters<typeof browser.newContext>[0] = {
    userAgent: UA,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    viewport: { width: 1366, height: 900 },
  };
  if (process.env.GS_STORAGE_STATE) (ctxOpts as any).storageState = process.env.GS_STORAGE_STATE;

  const ctx = await browser.newContext(ctxOpts);
  if (COOKIES) {
    await ctx.addCookies([
      ...parseCookieHeader(COOKIES, '.globalsources.com'),
      ...parseCookieHeader(COOKIES, '.globalsources.com.hk'),
      ...parseCookieHeader(COOKIES, `www.globalsources.${HOST}`),
    ]);
  }

  const page = await ctx.newPage();
  page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
  page.on('response', res => { if (res.status() >= 400) console.log('[http]', res.status(), res.url()); });

  await page.setExtraHTTPHeaders({
    Cookie: COOKIES,
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
  });
  await page.route('**/*', route => {
    const hdrs = { ...route.request().headers(), Cookie: COOKIES, 'Accept-Language': 'en-US,en;q=0.9' };
    route.continue({ headers: hdrs });
  });

  // Warm-up and navigate to search results
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800 + Math.floor(Math.random()*400));
  await page.goto(url, { waitUntil: 'domcontentloaded', referer: BASE, timeout: 90000 });

  const scrolls = Number(process.env.GS_SCROLLS_PER_PAGE || 10);
  const delay = Number(process.env.GS_SCROLL_DELAY_MS || 650);
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(delay);
  }

  const SELECTORS = [
    'a[href*="/product/"]',
    'a[href*="/prod/"]',
    'a[href*="/product-detail/"]',
    '[class*="product"] a[href*="/product"]',
    '[class*="card"] a[href*="/product"]',
    // mobile common
    'a.pro-item',
    'li.pro-item a',
    'ul.products-list a',
  ];

  let count = 0;
  for (const sel of SELECTORS) {
    try {
      const n = await page.locator(sel).count();
      if (n > 0) { console.log(`[match] ${sel} -> ${n}`); count = n; break; }
    } catch {}
  }

  const baseName = `${OUT}/${safeName(url)}`;
  await page.screenshot({ path: `${baseName}.png`, fullPage: true });
  fs.writeFileSync(`${baseName}.html`, await page.content());

  console.log('title:', await page.title());
  console.log('final URL:', page.url());
  console.log('cards found:', count);

  if (count === 0) {
    const mUrl = `https://m.globalsources.com/search?query=${encodeURIComponent(q)}`;
    await page.goto(mUrl, { waitUntil: 'domcontentloaded', referer: BASE, timeout: 90000 });
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }
    const mCount = await page.locator('a.pro-item, li.pro-item a, ul.products-list a').count();
    console.log('[mobile] cards found:', mCount);
    await page.screenshot({ path: `${baseName}.mobile.png`, fullPage: true });
    fs.writeFileSync(`${baseName}.mobile.html`, await page.content());
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
