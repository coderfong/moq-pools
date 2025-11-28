import { fetchProductDetail } from '../src/lib/providers/detail';

async function test() {
  // Test with a known Alibaba URL
  const testUrl = 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_1601208293182.html';
  
  console.log('Testing title extraction from:', testUrl);
  console.log('Setting SCRAPE_HEADLESS=1 to force headless mode');
  process.env.SCRAPE_HEADLESS = '1';
  console.log('');
  
  const detail = await fetchProductDetail(testUrl);
  
  if (detail) {
    console.log('\n✓ Detail fetched successfully');
    console.log('Title:', detail.title || '(empty)');
    console.log('Title length:', detail.title?.length || 0);
    console.log('Price:', detail.priceText || '(empty)');
    console.log('MOQ:', detail.moqText || '(empty)');
    console.log('Debug info:', detail.debug);
  } else {
    console.log('\n✗ Failed to fetch detail');
  }
}

test().catch(console.error);
