// Helper: open a browser to 1688 login, let the user log in, then capture cookies needed for scraping.
// Outputs a Cookie header string and writes it to scripts/cookies.1688.txt

async function main() {
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch {
    console.error('Playwright not installed. Please install devDependency "playwright".');
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    locale: 'zh-CN',
    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
  });
  const page = await ctx.newPage();
  const doneTarget = encodeURIComponent('https://s.1688.com/selloffer/offer_search.htm?keywords=socks&n=y');
  const loginUrl = `https://login.1688.com/member/signin.htm?from=sm&Done=${doneTarget}`;
  console.log('Opening:', loginUrl);
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  console.log('\nPlease complete login in the opened browser window.');
  console.log('After you see the search page, come back to this terminal and press Enter to continue...');
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  const cookies = await ctx.cookies();
  const wanted = cookies.filter(c => /1688\.com$/.test(c.domain));
  const cookieHeader = wanted.map(c => `${c.name}=${c.value}`).join('; ');
  const fs = await import('node:fs/promises');
  await fs.writeFile('scripts/cookies.1688.txt', cookieHeader, 'utf8');
  console.log('\nSaved cookies to scripts/cookies.1688.txt');
  console.log('\nSet this environment variable before running scripts:');
  console.log('PowerShell:');
  console.log(`  Set-Item Env:C1688_COOKIES "${cookieHeader.replace(/"/g, '\\"')}"`);
  console.log('Or add to .env.local as:');
  console.log('  C1688_COOKIES="' + cookieHeader.replace(/"/g, '\\"') + '"');
  await ctx.close();
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
