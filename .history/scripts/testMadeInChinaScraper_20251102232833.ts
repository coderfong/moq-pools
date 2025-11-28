import { fetchMadeInChina } from '../src/lib/providers/madeinchina';

async function testMadeInChinaScraper() {
  console.log('Testing updated Made-in-China scraper...\n');
  
  const results = await fetchMadeInChina('LED lights', 5);
  
  console.log(`Found ${results.length} products\n`);
  
  results.forEach((product, index) => {
    console.log(`\n=== Product ${index + 1} ===`);
    console.log(`Title: ${product.title}`);
    console.log(`URL: ${product.url}`);
    console.log(`Image: ${product.image?.substring(0, 100) || '(no image)'}`);
    console.log(`Price: ${product.price || '(no price)'}`);
    console.log(`MOQ: ${product.moq || '(no MOQ)'}`);
    console.log(`Store: ${product.storeName || '(no store)'}`);
  });
}

testMadeInChinaScraper().catch(console.error);
