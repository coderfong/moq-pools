const cheerio = require('cheerio');

const url = 'https://lurun-manholecover.en.made-in-china.com/product/NSYJteLoHRUK/China-China-Wholesales-PVC-Resin-Anti-Theft-Decorative-Fiberglass-Plastic-Resin-BMC-SMC-FRP-Square-Trench-Drain-Gratings-for-Composite.html';

async function testScrape() {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('\n=== Testing different selectors ===\n');

  // Test 1: Look for any tables
  console.log('Tables found:', $('table').length);
  $('table').each((i, table) => {
    const $table = $(table);
    const className = $table.attr('class') || 'no-class';
    const id = $table.attr('id') || 'no-id';
    console.log(`  Table ${i}: class="${className}", id="${id}"`);
  });

  // Test 2: Look for specification sections
  console.log('\nSections with "spec" in class or id:');
  $('[class*="spec"], [id*="spec"], [class*="param"], [id*="param"], [class*="attr"], [id*="attr"]').each((i, el) => {
    console.log(`  ${el.name}.${$(el).attr('class') || 'no-class'}#${$(el).attr('id') || 'no-id'}`);
  });

  // Test 3: Look for dt/dd pairs
  console.log('\ndt/dd pairs found:', $('dl dt').length);
  $('dl dt').slice(0, 5).each((i, dt) => {
    const label = $(dt).text().trim();
    const value = $(dt).next('dd').text().trim();
    console.log(`  "${label}": "${value}"`);
  });

  // Test 4: Look for divs with key-value patterns
  console.log('\nDivs with potential attributes:');
  $('div').filter((i, el) => {
    const text = $(el).text();
    return text.includes(':') && text.length < 200;
  }).slice(0, 10).each((i, div) => {
    console.log(`  "${$(div).text().trim().substring(0, 80)}..."`);
  });

  // Test 5: Save a snippet of HTML to inspect
  console.log('\n=== First 5000 chars of body HTML ===');
  console.log($('body').html()?.substring(0, 5000));
}

testScrape().catch(console.error);
