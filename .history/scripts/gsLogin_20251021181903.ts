import { chromium, devices } from 'playwright';

const HOST = (process.env.GS_HOST || 'com').toLowerCase(); // 'com' | 'com.hk'
const BASE = HOST === 'com.hk' ? 'https://www.globalsources.com.hk' : 'https://www.globalsources.com';

(async () => {
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36';

  // Headed + some helpful flags for stability
  const browser = await chromium.launch({ headless: false, args: [
    '--disable-blink-features=AutomationControlled',
    '--lang=en-US,en',
    '--window-size=1400,900',
    '--enable-unsafe-swiftshader',
  ]});

  const ctx = await browser.newContext({
    ...devices['Desktop Chrome'],
    userAgent: UA,
    viewport: { width: 1360, height: 860 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  // Basic stealth shims
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // @ts-ignore
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3] });
  });

  // Optional cookie header preload
  const cookieHeader = (process.env.GS_COOKIES || '').trim();
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(s => s.trim()).filter(Boolean).map(kv => {
      const i = kv.indexOf('=');
      const name = i > -1 ? kv.slice(0, i) : kv;
      const value = i > -1 ? kv.slice(i + 1) : '';
      return { name, value, url: BASE } as any;
    });
    try { await ctx.addCookies(cookies); } catch {}
  }

  const page = await ctx.newPage();
  // Block heavy font assets to reduce noise
  await ctx.route(/\.(?:woff2?|ttf|otf|eot)(?:\?|$)/i, r => r.abort());
  await ctx.route(/fonts\.gstatic\.com/i, r => r.abort());
  page.on('console', m => console.log('[console]', m.type(), m.text()));
  page.on('requestfailed', r => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

  console.log('Navigate to the site… Solve any captcha/interstitial if shown.');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.goto(`${BASE}/search-results?query=earbuds`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  console.log('When the page shows real results, close the window to save state.');
  await page.waitForEvent('close');

  await ctx.storageState({ path: 'gs.state.json' });
  await browser.close();
  console.log('Saved Playwright storage state to gs.state.json');
})().catch(err => { console.error(err); process.exit(1); });
