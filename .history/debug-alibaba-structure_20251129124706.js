#!/usr/bin/env node
/**
 * Deep dive into Alibaba page structure
 */

const cheerio = require('cheerio');

async function analyzeUrl() {
  const url = 'https://www.alibaba.com/product-detail/2-cylinder-dental-50L-2hp-mobile_60817384834.html';
  
  console.log('Fetching:', url, '\n');
  
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
  
  // Check for different data patterns
  console.log('=== Searching for image data patterns ===\n');
  
  let foundAny = false;
  
  $('script').each((i, script) => {
    const content = $(script).html();
    if (!content) return;
    
    // Pattern 1: Look for imageList or similar
    if (content.includes('imageList') || content.includes('imageUrl') || content.includes('productImage')) {
      console.log(`Script ${i} has image-related keywords:`);
      const lines = content.split('\n').filter(l => 
        l.includes('imageList') || l.includes('imageUrl') || l.includes('productImage')
      );
      lines.slice(0, 3).forEach(line => console.log('  ', line.trim().substring(0, 150)));
      console.log('');
      foundAny = true;
    }
    
    // Pattern 2: Look for sc04.alicdn.com URLs
    if (content.includes('sc04.alicdn.com')) {
      console.log(`Script ${i} has sc04.alicdn.com URLs:`);
      const matches = content.match(/https?:\/\/[^\s"']*sc04\.alicdn\.com[^\s"']*/g);
      if (matches) {
        matches.slice(0, 5).forEach(url => console.log('  ', url));
      }
      console.log('');
      foundAny = true;
    }
    
    // Pattern 3: Look for s.alicdn.com/@sc04
    if (content.includes('s.alicdn.com/@sc04')) {
      console.log(`Script ${i} has s.alicdn.com/@sc04 URLs:`);
      const matches = content.match(/https?:\/\/[^\s"']*s\.alicdn\.com\/@sc04[^\s"']*/g);
      if (matches) {
        matches.slice(0, 5).forEach(url => console.log('  ', url));
      }
      console.log('');
      foundAny = true;
    }
    
    // Pattern 4: JSON data objects
    if (content.includes('window.data') || content.includes('window.__')) {
      console.log(`Script ${i} has window data:`);
      const lines = content.split('\n').filter(l => 
        l.includes('window.data') || l.includes('window.__')
      );
      lines.slice(0, 2).forEach(line => console.log('  ', line.trim().substring(0, 150)));
      console.log('');
      foundAny = true;
    }
  });
  
  if (!foundAny) {
    console.log('❌ No image data patterns found!\n');
    console.log('Checking if page requires authentication or has anti-bot measures...\n');
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Page title:', $('title').text());
    console.log('Page size:', html.length, 'bytes');
  }
}

analyzeUrl().catch(console.error);
