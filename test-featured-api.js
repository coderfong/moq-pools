const fetch = require('node-fetch');

async function testFeaturedPoolsAPI() {
  try {
    console.log('Testing /api/pools/featured endpoint...\n');
    
    const response = await fetch('http://localhost:3007/api/pools/featured');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.pools && data.pools.length > 0) {
      console.log(`\n✅ Found ${data.pools.length} featured pools`);
      console.log('\nTop 3 pools by progress:');
      data.pools.slice(0, 3).forEach((pool, i) => {
        console.log(`\n${i + 1}. ${pool.title}`);
        console.log(`   Progress: ${pool.pledgedQty}/${pool.targetQty} (${pool.progressPercentage.toFixed(1)}%)`);
        console.log(`   Price: $${pool.price} (was $${pool.originalPrice})`);
        console.log(`   Days left: ${pool.daysLeft}`);
        console.log(`   SavedListing ID: ${pool.savedListingId}`);
      });
    } else {
      console.log('\n⚠️  No pools found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFeaturedPoolsAPI();
