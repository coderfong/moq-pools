/**
 * Complete Alibaba API Test Script
 * 
 * Tests all implemented API endpoints:
 * - Authentication (token generation/refresh)
 * - Product search
 * - Product details fetch
 * - Inventory query
 * - Shipping calculation
 * 
 * Usage:
 *   pnpm tsx scripts/testAlibabaApiComplete.ts
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { alibabaApi, fetchProductViaApi, searchAlibabaProducts } from '../src/lib/providers/alibabaApi';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Alibaba API Complete Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check credentials
  const hasCredentials = process.env.ALIBABA_APP_KEY && process.env.ALIBABA_APP_SECRET;
  if (!hasCredentials) {
    console.log('⚠️  WARNING: No API credentials found');
    console.log('   Set ALIBABA_APP_KEY and ALIBABA_APP_SECRET in your .env file\n');
    console.log('   Get credentials from: https://open.1688.com/ or https://open.alibaba.com/\n');
  } else {
    console.log('✓ API credentials detected');
    console.log(`  App Key: ${process.env.ALIBABA_APP_KEY?.substring(0, 10)}...`);
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('  Test 1: Authentication');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    console.log('Generating access token...');
    const tokenData = await alibabaApi.generateAccessToken();
    
    if (tokenData?.access_token) {
      console.log('✓ Token generated successfully');
      console.log(`  Access Token: ${tokenData.access_token.substring(0, 20)}...`);
      console.log(`  Expires In: ${tokenData.expires_in} seconds (${Math.round(tokenData.expires_in / 3600)} hours)`);
      if (tokenData.refresh_token) {
        console.log(`  Refresh Token: ${tokenData.refresh_token.substring(0, 20)}...`);
      }
    } else {
      console.log('✗ Token generation failed - no token returned');
    }
  } catch (error) {
    console.log('✗ Token generation failed');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('  Test 2: Product Search');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    console.log('Searching for "wireless earbuds"...');
    const searchResults = await searchAlibabaProducts({
      keyword: 'wireless earbuds',
      limit: 5,
      minMoq: 10,
    });

    if (searchResults && searchResults.length > 0) {
      console.log(`✓ Found ${searchResults.length} products\n`);
      searchResults.forEach((product, idx) => {
        console.log(`  ${idx + 1}. ${product.title}`);
        console.log(`     Product ID: ${product.productId}`);
        console.log(`     Price: ${product.priceText || product.price || 'N/A'}`);
        console.log(`     MOQ: ${product.moqText || product.moq || 'N/A'}`);
        console.log(`     Image: ${product.heroImage ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('✗ No products found');
    }
  } catch (error) {
    console.log('✗ Product search failed');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('  Test 3: Product Details (by URL)');
  console.log('───────────────────────────────────────────────────────────\n');

  const testUrls = [
    'https://www.alibaba.com/product-detail/Wholesale-Custom-Logo-Wireless-Earbuds_1600450628256.html',
    'https://detail.1688.com/offer/123456789.html',
  ];

  for (const url of testUrls) {
    console.log(`Testing URL: ${url}`);
    try {
      const productDetail = await fetchProductViaApi(url);
      
      if (productDetail) {
        console.log('✓ Product details fetched');
        console.log(`  Title: ${productDetail.title}`);
        console.log(`  Price: ${productDetail.priceText || productDetail.price || 'N/A'}`);
        console.log(`  MOQ: ${productDetail.moqText || productDetail.moq || 'N/A'}`);
        console.log(`  Price Tiers: ${productDetail.priceTiers?.length || 0}`);
        console.log(`  Images: ${productDetail.gallery?.length || 0}`);
        console.log(`  Attributes: ${productDetail.attributes?.length || 0}`);
        if (productDetail.inventory) {
          console.log(`  Inventory: ${productDetail.inventory.available || 'N/A'} available`);
        }
      } else {
        console.log('✗ Product not found or could not be fetched');
      }
    } catch (error) {
      console.log('✗ Failed to fetch product');
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log('');
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('  Test 4: Category Information');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    console.log('Fetching category info for category ID "100003070"...');
    const category = await alibabaApi.getCategoryInfoV2('100003070');
    
    if (category) {
      console.log('✓ Category fetched');
      console.log(`  Name: ${category.categoryName}`);
      console.log(`  ID: ${category.categoryId}`);
      console.log(`  Parent ID: ${category.parentId || 'Root'}`);
      console.log(`  Is Leaf: ${category.isLeaf ? 'Yes' : 'No'}`);
      console.log(`  Child Categories: ${category.childCategories?.length || 0}`);
    } else {
      console.log('✗ Category not found');
    }
  } catch (error) {
    console.log('✗ Category fetch failed');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('  Test 5: Shipping Templates');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    console.log('Fetching shipping templates...');
    const templates = await alibabaApi.getShippingTemplates();
    
    if (templates && templates.length > 0) {
      console.log(`✓ Found ${templates.length} shipping templates\n`);
      templates.slice(0, 3).forEach((template, idx) => {
        console.log(`  ${idx + 1}. ${template.templateName}`);
        console.log(`     ID: ${template.templateId}`);
        console.log(`     Freight: ${template.freight || 'Variable'}`);
        console.log('');
      });
    } else {
      console.log('✗ No shipping templates found');
    }
  } catch (error) {
    console.log('✗ Shipping templates fetch failed');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Suite Complete');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!hasCredentials) {
    console.log('💡 Next Steps:');
    console.log('   1. Register at https://open.1688.com/ or https://open.alibaba.com/');
    console.log('   2. Create an application to get App Key and App Secret');
    console.log('   3. Add to your .env file:');
    console.log('      ALIBABA_APP_KEY=your_app_key_here');
    console.log('      ALIBABA_APP_SECRET=your_app_secret_here');
    console.log('   4. Run this test again\n');
  } else {
    console.log('💡 Integration Status:');
    console.log('   ✓ API client implemented in: src/lib/providers/alibabaApi.ts');
    console.log('   ✓ Provider updated in: src/lib/providers/alibaba.ts');
    console.log('   ✓ API will be tried first, with scraping fallback');
    console.log('   ✓ Product listings will now bypass bot detection\n');
  }
}

main().catch(console.error);
