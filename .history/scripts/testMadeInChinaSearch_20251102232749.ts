import * as cheerio from 'cheerio';

async function testMadeInChinaSearch() {
  const url = 'https://www.made-in-china.com/products-search/hot-china-products/LED%20lights.html';
  
  console.log('Testing Made-in-China search page scraping...\n');
  console.log('URL:', url, '\n');

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // Look for the actual product grid/list
  console.log('=== LOOKING FOR PRODUCT CONTAINERS ===\n');
  
  const possibleContainers = [
    '.item-wrap',
    '.pro-item',
    '.product-list li',
    '.pro-list li',
    '[class*="pro-"] li',
    '#search-result li',
    '.J-item',
    'li[data-title]',
    'li[data-product]',
  ];

  possibleContainers.forEach(selector => {
    const count = $(selector).length;
    if (count > 0) {
      console.log(`Found ${count} items with: ${selector}`);
    }
  });

  // Try to find products by looking for links with /product/ in them
  console.log('\n=== FINDING PRODUCT LINKS ===\n');
  
  const productLinks = $('a[href*="/product/"]');
  console.log(`Total product links found: ${productLinks.length}`);
  
  if (productLinks.length > 0) {
    console.log('\n=== FIRST 3 PRODUCT LINKS ===\n');
    
    productLinks.slice(0, 3).each((_i: number, el: any) => {
      const $link = $(el);
      const href = $link.attr('href');
      const title = $link.attr('title');
      const text = $link.text().trim();
      
      // Find parent container
      const parent = $link.closest('li, div[class*="item"], div[class*="product"]');
      const parentClass = parent.attr('class');
      
      console.log(`Product ${_i + 1}:`);
      console.log(`  Link href: ${href?.substring(0, 100)}`);
      console.log(`  Link title: "${title}"`);
      console.log(`  Link text: "${text.substring(0, 50)}"`);
      console.log(`  Parent class: "${parentClass}"`);
      
      // Try to find title from parent
      const h2 = parent.find('h2').first().text().trim();
      const h3 = parent.find('h3').first().text().trim();
      const productName = parent.find('.product-name, .prd-name, .pro-name').first().text().trim();
      
      console.log(`  Parent h2: "${h2.substring(0, 50)}"`);
      console.log(`  Parent .product-name: "${productName.substring(0, 50)}"`);
      
      // Find image
      const img = parent.find('img').first();
      console.log(`  Image src: ${img.attr('src')?.substring(0, 80)}`);
      console.log(`  Image alt: "${img.attr('alt')}"`);
      console.log('');
    });
  }
}

testMadeInChinaSearch().catch(console.error);
