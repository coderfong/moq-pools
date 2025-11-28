import { fetchProductDetail } from '../src/lib/providers/detail';

async function test() {
  // Test with a known Alibaba URL
  const testUrl = 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_1601208293182.html';
  
  console.log('Testing title extraction from:', testUrl);
  console.log('');
  
  const detail = await fetchProductDetail(testUrl);
  
  if (detail) {
    console.log('✓ Detail fetched successfully');
    console.log('Title:', detail.title);
    console.log('Price:', detail.priceText);
    console.log('MOQ:', detail.moqText);
  } else {
    console.log('✗ Failed to fetch detail');
  }
}

test().catch(console.error);
