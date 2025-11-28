import { fetchProductDetail } from '../src/lib/providers/detail';

async function testImageExtraction() {
  const url = 'https://smartcn.en.made-in-china.com/product/qwSAFlgZpRcd/China-10-Inch-Screen-Android-15-Tablet-PC-Mtk6769-Mtk8786-Octa-Core-2-0GHz-2GB-32GB-1280-800-1920-1200FHD-Gms-WiFi-4G-LTE-Calling-Restaurant-Food-Ordering-Tablet.html';
  
  console.log('Testing Made-in-China image extraction...\n');
  console.log('URL:', url, '\n');

  const detail = await fetchProductDetail(url);

  if (detail) {
    console.log('✅ Product details fetched successfully!\n');
    console.log('Title:', detail.title);
    console.log('Price:', detail.priceText);
    console.log('MOQ:', detail.moqText);
    console.log('\n=== IMAGES ===');
    console.log('Hero Image:', detail.heroImage);
    console.log('\nGallery Images:', detail.gallery?.length || 0);
    detail.gallery?.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img}`);
    });
    console.log('\n=== ATTRIBUTES ===');
    detail.attributes?.slice(0, 5).forEach(attr => {
      console.log(`  ${attr.label}: ${attr.value}`);
    });
  } else {
    console.log('❌ Failed to fetch product details');
  }
}

testImageExtraction().catch(console.error);
