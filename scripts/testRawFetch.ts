async function main() {
  console.log('Testing RAW HTTP fetch to Alibaba...\n');
  
  const url = 'https://www.alibaba.com/product-detail/High-Quality-OEM-ODM-Toothbrush-Holder_1600450628256.html';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const html = await response.text();
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('HTML length:', html.length);
    console.log('\n=== First 1000 chars ===');
    console.log(html.substring(0, 1000));
    console.log('\n=== Searching for key indicators ===');
    console.log('Has h1:', html.includes('<h1'));
    console.log('Has product-title:', html.includes('product-title'));
    console.log('Has range-price:', html.includes('range-price'));
    console.log('Has ANTI-BOT markers:', /unusual\s+traffic|x5secdata|__cf_chl_captcha|verify\s*you\s*are\s*human|Captcha\s+Interception/i.test(html));
    console.log('Has mobile redirect:', /m\.alibaba\.com|mobile.*redirect/i.test(html));
  } catch (error) {
    console.error('Error:', error);
  }
}

main().finally(() => process.exit());
