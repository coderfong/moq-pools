import { chromium } from 'playwright';
import fs from 'fs/promises';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Hong_Kong',
  });
  const page = await ctx.newPage();
  const url = 'https://www.globalsources.com/search-results?query=mouse';
  console.log('Open this page and resolve any verifications if prompted...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForTimeout(10000); } catch {}
  const cookies = await ctx.cookies();
  const cookieStr = cookies.filter(c => c.domain.includes('globalsources.com')).map(c => `${c.name}=${c.value}`).join('; ');
  await fs.writeFile('scripts/cookies.globalsources.txt', cookieStr, 'utf8');
  console.log('\nSaved cookies to scripts/cookies.globalsources.txt');
  console.log('PowerShell example to set for this session:');
  console.log(`$Env:GS_COOKIES = "${cookieStr.replace(/"/g, '""')}"`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
