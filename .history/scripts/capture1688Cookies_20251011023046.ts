// Improved no-login cookie capture. Avoids login domain, retries with mobile search, saves x5sec cookie.
import { chromium } from 'playwright';
import fs from 'fs/promises';

const KEYWORD = process.env.C1688_CAPTURE_Q || '袜子';
const MAX_WAIT_MS = 120_000;

const desktopUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36';
const mobileUA =
  'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36';

const desktopSearch = (kw: string) =>
  `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(kw)}&n=y`;
const mobileSearch = (kw: string) =>
  `https://m.1688.com/offer_search/-${encodeURIComponent(kw)}.html`;

async function waitForX5sec(page: any) {
  await page.waitForFunction(
    () =>
      document.cookie.includes('x5sec') ||
      // offers present (various selectors both desktop/mobile)
      !!document.querySelector(
        '[data-offer-id], .offer-card, .organic-offer, .sm-offer-card, #sm-offer-list, .result-list, .window-offer-list'
      ),
    { timeout: MAX_WAIT_MS }
  );
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    userAgent: desktopUA,
    bypassCSP: true,
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await ctx.newPage();

  // 1) Try desktop search first
  let url = desktopSearch(KEYWORD);
  console.log('Opening (desktop):', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // If we got bounced to login, try mobile search directly
  if (page.url().includes('login.1688.com')) {
    console.log('Redirected to login – switching to mobile search...');
    await page.context().setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9',
    });
    await page.setUserAgent(mobileUA);
    url = mobileSearch(KEYWORD);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  console.log('If you see slider/verification, solve it. Do NOT log in.');
  // Let their JS run
  await page.waitForTimeout(2500);

  // retry once if still on login
  if (page.url().includes('login.1688.com')) {
    console.log('Still on login – forcing mobile search again...');
    await page.goto(mobileSearch(KEYWORD), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2500);
  }

  // Wait until x5sec cookie exists or offers render
  await waitForX5sec(page);

  // Grab cookies from the whole context (should include domain .1688.com)
  const cookies = await ctx.cookies();
  const cookieStr = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

  // Write both at project root and scripts/ for compatibility
  await fs.writeFile('cookies.1688.txt', cookieStr, 'utf8');
  try { await fs.writeFile('scripts/cookies.1688.txt', cookieStr, 'utf8'); } catch {}
  console.log('\n✅ Saved cookies to cookies.1688.txt');
  console.log('\nSet this for your shell and re-run ingest:');
  console.log('PowerShell:\n' + `Set-Item Env:C1688_COOKIES "${cookieStr.replace(/"/g, '""')}"`);
  console.log('\nBash:\n' + `export C1688_COOKIES='${cookieStr.replace(/'/g, "'\\''")}'`);

  await browser.close();
})();
