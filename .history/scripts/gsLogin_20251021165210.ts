import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.goto('https://www.globalsources.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  // Optional warm-up search
  await page.goto('https://www.globalsources.com/search-results?query=earbuds', { waitUntil: 'domcontentloaded' });
  console.log('Solve any interstitial/consent/login. Close the browser when done to save state.');
  await page.waitForEvent('close', { timeout: 0 }).catch(() => {});
  try { await context.storageState({ path: 'gs.state.json' }); } catch {}
  try { await browser.close(); } catch {}
})();
