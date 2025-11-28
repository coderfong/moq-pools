import * as cheerio from 'cheerio';

async function testMadeInChinaSearch() {
  const url = 'https://www.made-in-china.com/products-search/hot-china-products/LED%20lights.html';
  
  console.log('Testing Made-in-China search page scraping...\n');
  console.log('URL:', url, '\n');

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== PRODUCT CARDS ===\n');
  
  // Test different card selectors
  const cardSelectors = [
    '.prd-list',
    '.product-item',
    '.prd-item',
    '.list-item',
    '.result-item',
    '.pro-item',
    '.J-search-list-item',
    '[class*="search-list"]',
  ];

  for (const selector of cardSelectors) {
    const count = $(selector).length;
    if (count > 0) {
      console.log(`Found ${count} cards with selector: ${selector}`);
    }
  }

  console.log('\n=== ANALYZING FIRST PRODUCT ===\n');
  
  // Find first product card
  const firstCard = $('[class*="search-list"]').first();
  
  if (firstCard.length) {
    console.log('Card HTML preview:', firstCard.html()?.substring(0, 500));
    console.log('\n--- Title extraction attempts ---');
    
    // Try different title selectors
    const titleAttempts = [
      { name: 'a[title]', value: firstCard.find('a[title]').first().attr('title') },
      { name: 'a[href*=product] title attr', value: firstCard.find('a[href*=product]').first().attr('title') },
      { name: 'h2', value: firstCard.find('h2').first().text().trim() },
      { name: 'h3', value: firstCard.find('h3').first().text().trim() },
      { name: '.product-name', value: firstCard.find('.product-name').first().text().trim() },
      { name: '.prd-name', value: firstCard.find('.prd-name').first().text().trim() },
      { name: '.J-product-title', value: firstCard.find('.J-product-title').first().text().trim() },
      { name: 'first a text', value: firstCard.find('a').first().text().trim() },
    ];

    titleAttempts.forEach(({ name, value }) => {
      if (value) {
        console.log(`  ${name}: "${value.substring(0, 100)}"`);
      }
    });

    console.log('\n--- Image extraction ---');
    const img = firstCard.find('img').first();
    console.log('  img src:', img.attr('src')?.substring(0, 100));
    console.log('  img data-original:', img.attr('data-original')?.substring(0, 100));
    console.log('  img data-src:', img.attr('data-src')?.substring(0, 100));
    console.log('  img alt:', img.attr('alt')?.substring(0, 100));

    console.log('\n--- Price extraction ---');
    const cardText = firstCard.text();
    console.log('  Card text sample:', cardText.replace(/\s+/g, ' ').substring(0, 200));
    
    const priceMatch = cardText.match(/(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?(?:\s*-\s*(?:US\$|\$|USD|RMB|CNY|¥|￥)\s?\d{1,6}(?:[\.,]\d{1,2})?)?/);
    console.log('  Price match:', priceMatch?.[0]);

    console.log('\n--- Link extraction ---');
    const productLinks = firstCard.find('a[href*="/product/"]');
    console.log(`  Found ${productLinks.length} product links`);
    productLinks.slice(0, 3).each((_i: number, el: any) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      const title = $(el).attr('title');
      console.log(`    - href: ${href?.substring(0, 80)}`);
      console.log(`      text: "${text}"`);
      console.log(`      title: "${title}"`);
    });
  } else {
    console.log('No product cards found!');
  }
}

testMadeInChinaSearch().catch(console.error);
