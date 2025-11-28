import * as cheerio from 'cheerio';

async function testMadeInChina() {
  const url = 'https://smartcn.en.made-in-china.com/product/qwSAFlgZpRcd/China-10-Inch-Screen-Android-15-Tablet-PC-Mtk6769-Mtk8786-Octa-Core-2-0GHz-2GB-32GB-1280-800-1920-1200FHD-Gms-WiFi-4G-LTE-Calling-Restaurant-Food-Ordering-Tablet.html';
  
  console.log('Testing Made-in-China scraping...\n');
  console.log('URL:', url, '\n');

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== TITLE SELECTORS ===');
  console.log('h1:', $('h1').first().text().trim().substring(0, 100));
  console.log('.product-name:', $('.product-name').first().text().trim().substring(0, 100));
  console.log('.pro-title:', $('.pro-title').first().text().trim().substring(0, 100));
  console.log('.sr-proMainInfo-baseInfoH1:', $('.sr-proMainInfo-baseInfoH1').first().text().trim().substring(0, 100));
  console.log('[itemprop="name"]:', $('[itemprop="name"]').first().text().trim().substring(0, 100));
  console.log('meta[property="og:title"]:', $('meta[property="og:title"]').attr('content')?.substring(0, 100));

  console.log('\n=== PRICE SELECTORS ===');
  console.log('.price:', $('.price').first().text().trim());
  console.log('.sr-proMainInfo-baseInfo-propertyPrice:', $('.sr-proMainInfo-baseInfo-propertyPrice').first().text().trim());
  console.log('.only-one-priceNum:', $('.only-one-priceNum').first().text().trim());
  console.log('[itemprop="price"]:', $('[itemprop="price"]').first().text().trim());
  console.log('.price-num:', $('.price-num').first().text().trim());
  console.log('meta[property="og:price:amount"]:', $('meta[property="og:price:amount"]').attr('content'));

  console.log('\n=== IMAGE SELECTORS ===');
  console.log('meta[property="og:image"]:', $('meta[property="og:image"]').attr('content')?.substring(0, 100));
  console.log('.main-pic img:', $('.main-pic img').first().attr('src')?.substring(0, 100));
  console.log('#J-picShow img:', $('#J-picShow img').first().attr('src')?.substring(0, 100));
  console.log('[itemprop="image"]:', $('[itemprop="image"]').first().attr('src')?.substring(0, 100));

  console.log('\n=== MOQ SELECTORS ===');
  console.log('.sr-proMainInfo-baseInfo-propertyAttr:', $('.sr-proMainInfo-baseInfo-propertyAttr').first().text().trim().substring(0, 200));
  console.log('.min-order:', $('.min-order').first().text().trim());
  console.log('[itemprop="eligibleQuantity"]:', $('[itemprop="eligibleQuantity"]').first().text().trim());

  console.log('\n=== FULL ATTRIBUTES TABLE ===');
  $('.sr-proMainInfo-baseInfo-propertyAttr table tr').each((_i: number, tr: any) => {
    const th = $(tr).find('th, .th-label').first().text().trim();
    const td = $(tr).find('td').first().text().trim();
    if (th || td) {
      console.log(`Row ${_i}: "${th}" => "${td}"`);
    }
  });
}

testMadeInChina().catch(console.error);
