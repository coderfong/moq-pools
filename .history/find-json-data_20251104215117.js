const cheerio = require('cheerio');

const url = 'https://lurun-manholecover.en.made-in-china.com/product/NSYJteLoHRUK/China-China-Wholesales-PVC-Resin-Anti-Theft-Decorative-Fiberglass-Plastic-Resin-BMC-SMC-FRP-Square-Trench-Drain-Gratings-for-Composite.html';

async function findJsonData() {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('\n=== Looking for JSON data in scripts ===\n');

  // Look for script tags with JSON data
  $('script').each((i, script) => {
    const content = $(script).html() || '';
    
    // Look for common patterns
    if (content.includes('productDetail') || 
        content.includes('attributes') || 
        content.includes('specification') ||
        content.includes('parameter')) {
      
      console.log(`\n--- Script ${i} (contains product data) ---`);
      console.log(content.substring(0, 2000));
      console.log('...\n');
    }
  });

  // Look for window.__INITIAL_STATE__ or similar
  console.log('\n=== Looking for window state ===');
  const fullHtml = html;
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\});/,
    /window\.__STATE__\s*=\s*(\{[^;]+\});/,
    /var\s+productData\s*=\s*(\{[^;]+\});/,
    /var\s+detailData\s*=\s*(\{[^;]+\});/,
  ];

  for (const pattern of statePatterns) {
    const match = fullHtml.match(pattern);
    if (match) {
      console.log('Found state:', match[0].substring(0, 500));
    }
  }

  // Look for specific div with id="spec-details"
  console.log('\n=== Checking #spec-details ===');
  const specDetails = $('#spec-details');
  if (specDetails.length) {
    console.log('Found #spec-details');
    console.log('Children:', specDetails.children().length);
    console.log('HTML length:', specDetails.html()?.length || 0);
    console.log('Text:', specDetails.text().substring(0, 200));
  }

  // Save full HTML for manual inspection
  const fs = require('fs');
  fs.writeFileSync('mic-page.html', html);
  console.log('\n=== Full HTML saved to mic-page.html ===');
}

findJsonData().catch(console.error);
