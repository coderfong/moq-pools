import { fetchProductDetail } from '../src/lib/providers/detail';

async function main() {
  console.log('Testing DIRECT browser access to Alibaba...\n');
  
  const url = 'https://www.alibaba.com/product-detail/High-Quality-OEM-ODM-Toothbrush-Holder_1600450628256.html';
  
  console.log(`URL: ${url}\n`);
  console.log('Fetching with normal mode (no SCRAPE_HEADLESS)...\n');
  
  const detail = await fetchProductDetail({ url } as any);
  
  console.log('\n=== RESULT ===');
  console.log('Title:', detail?.title || '(empty)');
  console.log('Title length:', (detail?.title || '').length);
  console.log('Price:', detail?.priceText || '(empty)');
  console.log('MOQ:', detail?.moqText || '(empty)');
  console.log('Attributes count:', detail?.attributes?.length || 0);
  console.log('Price tiers:', detail?.priceTiers?.length || 0);
  console.log('Debug info:', (detail as any)?.debug || []);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
