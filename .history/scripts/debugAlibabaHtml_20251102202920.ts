import * as cheerio from 'cheerio';

async function debugHtml() {
  const testUrl = 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_1601208293182.html';
  
  console.log('Fetching:', testUrl);
  
  const response = await fetch(testUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('\n=== HTML Length ===');
  console.log(html.length, 'characters');
  
  console.log('\n=== Checking for anti-bot ===');
  const hasAntiBot = /unusual\s+traffic|x5secdata|__cf_chl_captcha|verify\s*you\s*are\s*human/i.test(html);
  console.log('Anti-bot detected:', hasAntiBot);
  
  console.log('\n=== Title Selectors ===');
  console.log('h1.product-title:', $('h1.product-title').length);
  console.log('h1.title:', $('h1.title').length);
  console.log('h1:', $('h1').length);
  console.log('h1 text:', $('h1').first().text().substring(0, 100));
  
  console.log('\n=== Meta Tags ===');
  console.log('og:title:', $('meta[property="og:title"]').attr('content')?.substring(0, 100));
  console.log('title tag:', $('title').text().substring(0, 100));
  
  console.log('\n=== Module Title ===');
  const moduleTitle = $('[data-module-name="module_title"]');
  console.log('module_title found:', moduleTitle.length);
  console.log('module_title h1:', moduleTitle.find('h1').text().substring(0, 100));
  
  console.log('\n=== Data attributes ===');
  const h1WithTitle = $('h1[title]');
  console.log('h1[title] found:', h1WithTitle.length);
  console.log('h1[title] attribute:', h1WithTitle.attr('title')?.substring(0, 100));
  console.log('h1[title] text:', h1WithTitle.text().substring(0, 100));
  
  // Save sample HTML for inspection
  const sampleHtml = html.substring(0, 5000);
  console.log('\n=== First 1000 chars of HTML ===');
  console.log(sampleHtml.substring(0, 1000));
}

debugHtml().catch(console.error);
