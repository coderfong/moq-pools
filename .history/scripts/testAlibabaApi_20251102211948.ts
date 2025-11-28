import { AlibabaApiClient, fetchProductViaApi } from '../src/lib/providers/alibabaApi';

/**
 * Test script for Alibaba Official API integration
 * 
 * Before running:
 * 1. Get your App Key and App Secret from https://open.alibaba.com/
 * 2. Add them to .env.local:
 *    ALIBABA_APP_KEY=your_key
 *    ALIBABA_APP_SECRET=your_secret
 * 3. Run: pnpm tsx scripts/testAlibabaApi.ts
 */

async function testAlibabaApi() {
  console.log('🧪 Testing Alibaba Official API Integration\n');

  // Check credentials
  const appKey = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error('❌ ERROR: API credentials not configured');
    console.log('\nPlease add to your .env.local file:');
    console.log('ALIBABA_APP_KEY=your_app_key_here');
    console.log('ALIBABA_APP_SECRET=your_app_secret_here');
    console.log('\nGet credentials from: https://open.alibaba.com/');
    process.exit(1);
  }

  console.log('✅ Credentials found:');
  console.log(`   App Key: ${appKey.substring(0, 8)}...`);
  console.log(`   App Secret: ${appSecret.substring(0, 8)}...\n`);

  // Test URLs
  const testUrls = [
    'https://www.alibaba.com/product-detail/High-Quality-OEM-ODM-Toothbrush-Holder_1600450628256.html',
    'https://www.alibaba.com/product-detail/Custom-Logo-Eco-Friendly-Bamboo-Toothbrush_62588837641.html',
    // Uncomment if testing 1688.com:
    // 'https://detail.1688.com/offer/123456789.html',
  ];

  for (const url of testUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));

    try {
      // Test using the helper function (same as detail.ts uses)
      const result = await fetchProductViaApi(url);

      if (result) {
        console.log('\n✅ SUCCESS - Product fetched via API:');
        console.log(`\n📦 Title: ${result.title || '(empty)'}`);
        console.log(`💰 Price: ${result.price || '(empty)'}`);
        console.log(`📊 MOQ: ${result.moq || '(empty)'}`);
        console.log(`🏷️  Attributes: ${result.attributes?.length || 0} items`);
        
        if (result.attributes && result.attributes.length > 0) {
          console.log('\nFirst 3 attributes:');
          result.attributes.slice(0, 3).forEach((attr: any) => {
            console.log(`  - ${attr.name}: ${attr.value}`);
          });
        }

        console.log(`\n💵 Price Tiers: ${result.priceTiers?.length || 0} tiers`);
        if (result.priceTiers && result.priceTiers.length > 0) {
          console.log('Price tiers:');
          result.priceTiers.forEach((tier: any) => {
            console.log(`  - ${tier.minQuantity || tier.startQuantity}+: ${tier.price || tier.unitPrice}`);
          });
        }

        console.log(`\n🖼️  Images: ${result.images?.length || 0} images`);
        if (result.images && result.images.length > 0) {
          console.log(`   First image: ${result.images[0].substring(0, 60)}...`);
        }

        console.log(`\n📦 Packaging: ${result.packaging?.length || 0} items`);
        console.log(`🏭 Supplier: ${result.supplier?.name || '(not provided)'}`);

      } else {
        console.log('\n⚠️  WARNING: API returned null/undefined');
        console.log('Possible causes:');
        console.log('  - Product ID extraction failed');
        console.log('  - API request failed');
        console.log('  - Product not found');
      }

    } catch (error: any) {
      console.error('\n❌ ERROR:', error.message);
      
      if (error.message.includes('credentials not configured')) {
        console.log('\n💡 Make sure .env.local has:');
        console.log('   ALIBABA_APP_KEY=...');
        console.log('   ALIBABA_APP_SECRET=...');
      } else if (error.message.includes('401')) {
        console.log('\n💡 Authentication failed - check your credentials');
      } else if (error.message.includes('403')) {
        console.log('\n💡 Permission denied - verify API access in developer portal');
      } else if (error.message.includes('404')) {
        console.log('\n💡 Product not found - the API may not have this product');
      } else {
        console.log('\n💡 Full error:', error);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Test Complete');
  console.log('='.repeat(80) + '\n');

  // Also test direct client usage
  console.log('\n📚 Testing AlibabaApiClient directly:\n');
  
  const client = new AlibabaApiClient({ appKey, appSecret });
  
  const testProductId = '1600450628256';
  console.log(`Fetching product ID: ${testProductId}`);
  
  try {
    const product = await client.getProductDetail(testProductId);
    console.log('✅ Direct API call successful!');
    console.log('Product subject:', product?.subject || '(not in response)');
  } catch (error: any) {
    console.error('❌ Direct API call failed:', error.message);
  }
}

// Run the test
testAlibabaApi().catch(console.error);
