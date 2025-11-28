/**
 * Test Made-in-China detail scraper - find a valid product URL first
 */

import { searchProducts } from '../src/lib/providers/madeinchina';

async function findTestUrl() {
  console.log('Finding a valid Made-in-China product URL...\n');
  
  try {
    const results = await searchProducts('cookware', 1);
    
    if (!results || results.length === 0) {
      console.error('❌ No products found');
      return;
    }
    
    console.log(`✅ Found ${results.length} products\n`);
    
    // Show first 5 products
    results.slice(0, 5).forEach((product, i) => {
      console.log(`${i + 1}. ${product.title}`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Price: ${product.priceRaw || 'N/A'}`);
      console.log(`   Image: ${product.image || 'N/A'}`);
      console.log('');
    });
    
    console.log('\nTest with one of these URLs:');
    console.log(`pnpm tsx scripts/testMadeInChinaSingleProduct.ts "${results[0].url}"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findTestUrl();
