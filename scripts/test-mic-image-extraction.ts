import { getMadeInChinaDetailSecondImage } from '../src/lib/providers/madeinchina';

async function test() {
  const url = 'https://hfsublime.en.made-in-china.com/product/PRfpIyFrbThw/China-Halloween-Window-Clings-Stickers-Pumpkin-Spide-Web-Decals-for-Glass-Windows.html';
  
  console.log('Testing Made-in-China image extraction...');
  console.log('URL:', url);
  console.log('');
  
  const imageUrl = await getMadeInChinaDetailSecondImage(url);
  
  console.log('Extracted image URL:', imageUrl);
  console.log('');
  
  if (imageUrl) {
    console.log('✅ Successfully extracted image from detail page');
  } else {
    console.log('❌ Failed to extract image from detail page');
  }
  
  process.exit(0);
}

test();
