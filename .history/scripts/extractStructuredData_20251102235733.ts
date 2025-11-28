/**
 * Extract JSON-LD structured data from Made-in-China
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

const url = process.argv[2] || 'https://bosommetal.en.made-in-china.com/product/ZnRpPoNVbThW/China-Stainless-Steel-Utensils-Kitchenware-26cm-80cm-Multi-Size-Optional-Durable-Wok-Pan.html';

async function extractStructuredData() {
  console.log('Extracting structured data...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Find all JSON-LD script tags
    console.log('=== JSON-LD STRUCTURED DATA ===\n');
    $('script[type="application/ld+json"]').each((i, script) => {
      const content = $(script).html();
      if (content) {
        try {
          const data = JSON.parse(content);
          console.log(`\nScript ${i}:`);
          console.log(JSON.stringify(data, null, 2));
          
          // Check if it's a Product with Offer
          if (data['@type'] === 'Product' && data.offers) {
            console.log('\n✅ FOUND PRODUCT OFFER DATA:');
            console.log(`Price: ${data.offers.price || 'N/A'}`);
            console.log(`Price Currency: ${data.offers.priceCurrency || 'N/A'}`);
            console.log(`Availability: ${data.offers.availability || 'N/A'}`);
          }
        } catch (e) {
          console.log(`  (Not valid JSON)`);
        }
      }
    });
    
    // Also check all script tags for price-related objects
    console.log('\n\n=== SEARCHING ALL SCRIPTS FOR PRICE OBJECTS ===\n');
    $('script:not([type="application/ld+json"])').each((i, script) => {
      const content = $(script).html() || '';
      
      // Look for objects that might contain price tier info
      const priceRegex = /"price":\s*"?([^",}]+)"?|"lowPrice":\s*"?([^",}]+)"?|"highPrice":\s*"?([^",}]+)"?/g;
      const matches = [...content.matchAll(priceRegex)];
      
      if (matches.length > 0) {
        console.log(`\nScript ${i} - Found price references:`);
        matches.slice(0, 5).forEach(match => {
          console.log(`  ${match[0]}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

extractStructuredData();
