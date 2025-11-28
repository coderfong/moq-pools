// Test Cron Job for Checking Expired Pools
// Usage: node test-cron-check-pools.js

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
const CRON_SECRET = process.env.CRON_SECRET;

async function testCronJob() {
  try {
    console.log('\n🔄 Testing cron job: Check expired pools\n');
    console.log(`API URL: ${API_URL}`);
    console.log(`Auth: ${CRON_SECRET ? 'Using CRON_SECRET' : 'No CRON_SECRET (may fail)'}\n`);

    const response = await fetch(`${API_URL}/api/cron/check-pools`, {
      method: 'GET',
      headers: {
        ...(CRON_SECRET && { 'Authorization': `Bearer ${CRON_SECRET}` }),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Cron job failed:', result.error);
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('\n💡 Tip: Set CRON_SECRET environment variable');
      }
      return;
    }

    console.log('✅ Cron job executed successfully!\n');
    console.log('Execution Details:');
    console.log(`  Timestamp: ${result.timestamp}`);
    console.log(`  Pools Checked: ${result.checked}`);
    console.log(`  Pools Processed: ${result.results?.length || 0}\n`);

    if (!result.results || result.results.length === 0) {
      console.log('ℹ️  No expired pools found.\n');
      console.log('   This means:');
      console.log('   - All OPEN pools have deadlines in the future');
      console.log('   - Or there are no OPEN pools at all\n');
      return;
    }

    console.log('Pool Processing Results:\n');
    result.results.forEach((pool, idx) => {
      console.log(`${idx + 1}. Pool: ${pool.poolTitle || pool.poolId}`);
      console.log(`   ID: ${pool.poolId}`);
      console.log(`   Progress: ${pool.pledgedQty}/${pool.targetQty}`);
      console.log(`   Action: ${pool.action.toUpperCase()}`);
      console.log(`   Status: ${pool.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (pool.action === 'captured' && pool.result?.summary) {
        console.log(`   Payments Captured: ${pool.result.summary.succeeded}/${pool.result.summary.total}`);
      }
      
      if (pool.action === 'refunded' && pool.result?.summary) {
        console.log(`   Payments Refunded: ${pool.result.summary.succeeded}/${pool.result.summary.total}`);
      }
      
      if (pool.error) {
        console.log(`   Error: ${pool.error}`);
      }
      
      console.log('');
    });

    console.log('🎉 Cron job test completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCronJob();
