import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugHeadless() {
  const url = 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_1601208293182.html';
  
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  try {
    const ctx = await browser.newContext({ 
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' 
    });
    const page = await ctx.newPage();
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    
    console.log('Waiting for h1...');
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      console.log('✓ h1 found');
    } catch {
      console.log('✗ h1 not found within timeout');
    }
    
    console.log('Getting page content...');
    const html = await page.content();
    
    console.log('\n=== HTML Stats ===');
    console.log('HTML length:', html.length);
    
    // Save to file
    fs.writeFileSync('d:\\downloads\\moq-pools-full\\headless-output.html', html, 'utf8');
    console.log('✓ Saved HTML to headless-output.html');
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    console.log('\n=== Title Extraction ===');
    console.log('h1 count:', $('h1').length);
    console.log('h1 text:', $('h1').first().text().substring(0, 150));
    console.log('h1[title] attr:', $('h1[title]').attr('title')?.substring(0, 150));
    console.log('meta og:title:', $('meta[property="og:title"]').attr('content')?.substring(0, 150));
    console.log('title tag:', $('title').text().substring(0, 150));
    
    console.log('\n=== Module Title ===');
    const moduleTitle = $('[data-module-name="module_title"]');
    console.log('module_title count:', moduleTitle.length);
    console.log('module_title h1:', moduleTitle.find('h1').text().substring(0, 150));
    
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

debugHeadless().catch(console.error);
