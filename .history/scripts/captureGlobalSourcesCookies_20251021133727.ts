import { chromium } from 'playwright';
import fs from 'fs/promises';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Hong_Kong',
  });
  await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {} });
  const page = await ctx.newPage();
  const url = 'https://www.globalsources.com/search-results?query=mouse';
  console.log('If challenged, resolve any verification. Waiting briefly to collect cookies...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForTimeout(8000); } catch {}
  // If nothing, try a mobile session as well
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Hong_Kong',
  });
  await mctx.addInitScript(() => { try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {} });
  const mp = await mctx.newPage();
  try { await mp.goto('https://m.globalsources.com/products?query=mouse', { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch {}
  try { await mp.waitForTimeout(5000); } catch {}
  // Merge cookies from both contexts
  const cookies: any[] = [];
  try { cookies.push(...await ctx.cookies()); } catch {}
  try { cookies.push(...await mctx.cookies()); } catch {}
  const cookieStr = cookies.filter(c => (c.domain || '').includes('globalsources.com')).map(c => `${c.name}=${c.value}`).join('; ');
  await fs.writeFile('scripts/cookies.globalsources.txt', cookieStr, 'utf8');
  console.log('\nSaved cookies to scripts/cookies.globalsources.txt');
  console.log('PowerShell example to set for this session:');
  console.log(`$Env:GS_COOKIES = "${(cookieStr || '').replace(/"/g, '""')}"`);
  await mctx.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
