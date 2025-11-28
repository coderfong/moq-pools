import { getMadeInChinaDetailSecondImage } from '../src/lib/providers/madeinchina';

async function test() {
  // Test with the soap dish example you mentioned
  const testUrls = [
    'https://hfsublime.en.made-in-china.com/product/PRfpIyFrbThw/China-Halloween-Window-Clings-Stickers-Pumpkin-Spide-Web-Decals-for-Glass-Windows.html',
    // Add any Made-in-China product URLs you want to test
  ];
  
  console.log('Testing Made-in-China image extraction for multiple products...\n');
  
  for (const url of testUrls) {
    console.log('Testing:', url);
    const imageUrl = await getMadeInChinaDetailSecondImage(url);
    
    if (imageUrl) {
      console.log('✅ Extracted:', imageUrl);
      
      // Check if it's a WebP from image.made-in-china.com
      if (imageUrl.includes('image.made-in-china.com') && imageUrl.endsWith('.webp')) {
        console.log('   Format: WebP from Made-in-China CDN ✓');
      }
    } else {
      console.log('❌ Failed to extract image');
    }
    console.log('');
  }
  
  process.exit(0);
}

test();
