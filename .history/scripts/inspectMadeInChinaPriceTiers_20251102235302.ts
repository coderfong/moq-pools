/**
 * Test to inspect Made-in-China price tier HTML structure
 */

import * as cheerio from 'cheerio';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  return res.text();
}

const url = process.argv[2] || 'https://designsdelivery.en.made-in-china.com/product/iGqpgaUTOMcC/China-Honeycomb-Cast-Iron-Milk-Pot-Non-Stick-Die-Casting-Frying-Pans-with-Beech-Handle-Lightweight-Cast-Iron-Wok.html';

async function inspectPriceTiers() {
  console.log('Inspecting Made-in-China price tier structure...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await fetchHtml(url);
    if (!html) {
      console.error('❌ Failed to fetch HTML');
      return;
    }
    
    const $ = cheerio.load(html);
    
    console.log('=== PRICE SECTION HTML ===\n');
    
    // Look for price-related containers
    const priceContainers = [
      '.sr-proMainInfo-baseInfo-propertyPrice',
      '.baseInfo-price-related',
      '.price-table',
      '.price-tier',
      '.sr-proMainInfo-baseInfo',
      '[class*="price"]',
      '[class*="Price"]'
    ];
    
    priceContainers.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\n${selector} (${elements.length} found):`);
        elements.slice(0, 3).each((i, el) => {
          const html = $(el).html();
          const text = $(el).text();
          console.log(`  [${i}] HTML: ${html?.substring(0, 200)}${html && html.length > 200 ? '...' : ''}`);
          console.log(`      Text: ${text.trim().substring(0, 150)}`);
        });
      }
    });
    
    // Look for table structures that might contain price tiers
    console.log('\n\n=== PRICE TIER TABLES ===\n');
    
    $('table').each((i, table) => {
      const tableText = $(table).text();
      if (/price|tier|quantity|moq|pieces/i.test(tableText)) {
        console.log(`\nTable ${i}:`);
        console.log('HTML:', $(table).html()?.substring(0, 300));
        console.log('\nRows:');
        $(table).find('tr').each((rowIdx, tr) => {
          const cells = $(tr).find('td, th').map((_, cell) => $(cell).text().trim()).get();
          console.log(`  Row ${rowIdx}: ${cells.join(' | ')}`);
        });
      }
    });
    
    // Look for specific price tier patterns
    console.log('\n\n=== SEARCHING FOR PRICE TIER PATTERNS ===\n');
    
    const patterns = [
      /(\d+[\s-]*(?:to|-)[\s-]*\d+)\s*(?:pieces?|pcs?|units?)[\s:]*(?:US\$|USD|\$|¥|￥|RMB)[\s]*([\d,\.]+)/gi,
      /(?:US\$|USD|\$|¥|￥|RMB)[\s]*([\d,\.]+)[\s]*\/[\s]*(\d+[\s-]*(?:to|-)[\s-]*\d+)\s*(?:pieces?|pcs?|units?)/gi,
      /≥[\s]*(\d+)[\s]*(?:pieces?|pcs?)[\s:]*(?:US\$|USD|\$)[\s]*([\d,\.]+)/gi
    ];
    
    const bodyText = $('body').text();
    patterns.forEach((pattern, idx) => {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`Pattern ${idx + 1} matches:`);
        matches.slice(0, 5).forEach(match => {
          console.log(`  - ${match}`);
        });
      }
    });
    
    // Check for specific price tier elements
    console.log('\n\n=== PROPERTY ATTR TABLE (Price Tiers) ===\n');
    $('.sr-proMainInfo-baseInfo-propertyAttr table tr').each((i, tr) => {
      const th = $(tr).find('th, .th-label').first().text().trim();
      const td = $(tr).find('td').first().text().trim();
      if (/price|tier|quantity|moq/i.test(th) || /price|tier|quantity|moq|\$|USD|¥/i.test(td)) {
        console.log(`Row ${i}: ${th} => ${td}`);
      }
    });
    
    console.log('\n\n=== BASIC INFO SECTION (Price Tiers) ===\n');
    $('.bsc-info .bsc-item').each((i, item) => {
      const label = $(item).find('.bac-item-label').first().text().trim();
      const value = $(item).find('.bac-item-value').first().text().trim();
      if (/price|tier|quantity|moq/i.test(label) || /price|tier|quantity|\$|USD|¥/i.test(value)) {
        console.log(`Item ${i}: ${label} => ${value}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectPriceTiers();
