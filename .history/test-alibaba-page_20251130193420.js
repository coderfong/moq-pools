#!/usr/bin/env node
/**
 * Quick test to see what images are on an Alibaba page
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

  if (!response.ok) {
    console.error('HTTP Error:', response.status);
    return;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('\nAll img tags with alicdn.com:');
  let count = 0;
  $('img[src*="alicdn.com"]').each((i, img) => {
    const src = $(img).attr('src');
    count++;
    if (i < 20) {
      console.log(`  ${i+1}. ${src}`);
    }
  });
  console.log(`\nTotal: ${count} images found`);
  
  console.log('\n\nAll img tags (any src):');
  let anyCount = 0;
  $('img[src]').each((i, img) => {
    const src = $(img).attr('src');
    anyCount++;
    if (i < 10) {
      console.log(`  ${i+1}. ${src}`);
    }
  });
  console.log(`\nTotal: ${anyCount} images with src found`);
  
  // Check for data attributes
  console.log('\n\nImages with data-src:');
  $('img[data-src]').each((i, img) => {
    const src = $(img).attr('data-src');
    if (i < 10) {
      console.log(`  ${i+1}. ${src}`);
    }
  });
}

testUrl().catch(console.error);
