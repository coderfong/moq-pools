#!/usr/bin/env node
/**
 * Check if Alibaba embeds image data in JSON
 */

const cheerio = require('cheerio');

async function testUrl() {
  const url = 'https://www.alibaba.com/product-detail/OEM-Respiratory-Protection-Particulate-Filter-Cotton_1601002496233.html';
  
  console.log('Fetching:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Look for script tags with JSON data
  console.log('\nSearching for image URLs in script tags...\n');
  
  $('script').each((i, script) => {
    const content = $(script).html();
    if (!content) return;
    
    // Look for alicdn.com URLs in the script content
    const matches = content.match(/https:\/\/[^\s"']+alicdn\.com[^\s"']+(\.jpg|\.jpeg)/gi);
    if (matches && matches.length > 0) {
      console.log(`Found ${matches.length} image URLs in script tag ${i+1}:`);
      matches.slice(0, 5).forEach((url, idx) => {
        console.log(`  ${idx+1}. ${url}`);
      });
      console.log('');
    }
  });
  
  // Also check for window.data or similar
  console.log('\nSearching for JSON data objects...\n');
  $('script').each((i, script) => {
    const content = $(script).html();
    if (!content) return;
    
    // Look for window data assignments
    if (content.includes('window.') && content.includes('imageList')) {
      console.log(`Script ${i+1} has window.imageList:`);
      const lines = content.split('\n').filter(l => l.includes('imageList'));
      lines.slice(0, 5).forEach(line => console.log(line.trim()));
      console.log('');
    }
  });
}

testUrl().catch(console.error);
