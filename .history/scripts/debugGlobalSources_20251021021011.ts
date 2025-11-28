import fs from 'node:fs/promises';

async function main() {
  const { chromium } = await import('playwright');
  const q = process.argv.slice(2).join(' ') || 'gaming mouse';
  const base = 'https://www.globalsources.com';
  const enc = encodeURIComponent(q);
  const urls = [
    `${base}/search-results?query=${enc}`,
    `${base}/wholesale/${enc}.html`,
    `${base}/manufacturers/${enc}.html`,
  ];
  const proxyServer = process.env.GS_PROXY || process.env.HTTP_PROXY || process.env.http_proxy || '';
  const launchOpts: any = { headless: false };
  if (proxyServer) launchOpts.proxy = { server: proxyServer };
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Hong_Kong',
  });
  const page = await context.newPage();
  for (const url of urls) {
    try {
      console.log('\nVisiting', url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      // Consent
      try { await page.locator('button:has-text("Accept")').first().click({ timeout: 1500 }); } catch {}
      try { await page.locator('button:has-text("I agree")').first().click({ timeout: 1500 }); } catch {}
      try { await page.waitForSelector('a[href*="/product/"]', { timeout: 6000 }); } catch {}
      try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
      for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 1000)); await page.waitForTimeout(400); }
      const title = await page.title();
      console.log('title:', title);
      const linkCount = await page.$$eval('a[href]', (as) => as.length);
      console.log('total links:', linkCount);
      const prodLinks = await page.$$eval('a[href*="/product/"]', (as) => as.slice(0, 20).map((a: any) => a.href));
      console.log('sample product links:', prodLinks);
      const hasCard = await page.$eval('body', (b) => /product-card|product-list-item|data-qa=\"product-card\"|ProductCard|product-item/.test(b.innerHTML));
      console.log('has known card markers:', hasCard);
      const html = await page.content();
      await fs.mkdir('tmp', { recursive: true });
      const fileSafe = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 100);
      await fs.writeFile(`tmp/${fileSafe}.html`, html);
      console.log('Saved HTML to', `tmp/${fileSafe}.html`);
    } catch (e) {
      console.warn('Page error for', url, (e as Error)?.message);
    }
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
