/**
 * Test Rate Limiting and Concurrency Controls
 * 
 * This script tests the new performance optimizations:
 * 1. Rate limiting (10 requests/minute)
 * 2. Concurrency limits (max 5 simultaneous)
 * 3. Cache functionality (5 minute TTL)
 */

const API_URL = 'http://localhost:3007/api/rescrape';

async function testRateLimiting() {
  console.log('\n=== Testing Rate Limiting ===\n');
  
  const testListingId = 'YOUR_TEST_LISTING_ID'; // Replace with a valid listing ID
  
  console.log('Sending 12 rapid requests to test 10/min rate limit...\n');
  
  let success = 0;
  let rateLimited = 0;
  
  const requests = Array.from({ length: 12 }, async (_, i) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: testListingId })
      });
      
      if (response.status === 429) {
        console.log(`Request ${i + 1}: ⛔ Rate limited (429)`);
        rateLimited++;
      } else if (response.ok) {
        const data = await response.json();
        console.log(`Request ${i + 1}: ✅ Success ${data.fromCache ? '(cached)' : '(fresh)'}`);
        success++;
      } else {
        console.log(`Request ${i + 1}: ❌ Error ${response.status}`);
      }
    } catch (err) {
      console.log(`Request ${i + 1}: ❌ ${err.message}`);
    }
  });
  
  await Promise.all(requests);
  
  console.log(`\nResults: ${success} success, ${rateLimited} rate limited`);
  console.log(`Expected: ~10 success, ~2 rate limited\n`);
}

async function testConcurrency() {
  console.log('\n=== Testing Concurrency Limits ===\n');
  
  // You'll need 10 valid listing IDs for this test
  const testListingIds = [
    'listing1', 'listing2', 'listing3', 'listing4', 'listing5',
    'listing6', 'listing7', 'listing8', 'listing9', 'listing10'
  ];
  
  console.log('Sending 10 simultaneous requests to test 5-concurrent limit...\n');
  
  let success = 0;
  let serverBusy = 0;
  let alreadyScraping = 0;
  
  const start = Date.now();
  
  const requests = testListingIds.map(async (listingId, i) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, force: true }) // force=true bypasses cache
      });
      
      const duration = Date.now() - start;
      
      if (response.status === 503) {
        console.log(`[${duration}ms] Request ${i + 1}: 🔒 Server busy (503)`);
        serverBusy++;
      } else if (response.status === 429) {
        const data = await response.json();
        if (data.error?.includes('Already scraping')) {
          console.log(`[${duration}ms] Request ${i + 1}: 🔄 Already scraping (429)`);
          alreadyScraping++;
        } else {
          console.log(`[${duration}ms] Request ${i + 1}: ⛔ Rate limited (429)`);
        }
      } else if (response.ok) {
        console.log(`[${duration}ms] Request ${i + 1}: ✅ Success`);
        success++;
      } else {
        console.log(`[${duration}ms] Request ${i + 1}: ❌ Error ${response.status}`);
      }
    } catch (err) {
      console.log(`Request ${i + 1}: ❌ ${err.message}`);
    }
  });
  
  await Promise.all(requests);
  
  const totalTime = Date.now() - start;
  
  console.log(`\nResults: ${success} success, ${serverBusy} busy, ${alreadyScraping} duplicate`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Expected: Max 5 success initially, rest queued or rejected\n`);
}

async function testCache() {
  console.log('\n=== Testing Cache ===\n');
  
  const testListingId = 'YOUR_TEST_LISTING_ID'; // Replace with a valid listing ID
  
  console.log('Request 1: Fresh scrape...');
  const start1 = Date.now();
  const response1 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId: testListingId })
  });
  const duration1 = Date.now() - start1;
  const data1 = await response1.json();
  console.log(`✅ Completed in ${duration1}ms ${data1.fromCache ? '(cached)' : '(fresh)'}\n`);
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Request 2: Should use cache...');
  const start2 = Date.now();
  const response2 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId: testListingId })
  });
  const duration2 = Date.now() - start2;
  const data2 = await response2.json();
  console.log(`✅ Completed in ${duration2}ms ${data2.fromCache ? '(cached)' : '(fresh)'}\n`);
  
  if (data2.fromCache && duration2 < duration1 / 10) {
    console.log('✅ Cache working! Second request was much faster.\n');
  } else {
    console.log('⚠️  Cache may not be working as expected.\n');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('PERFORMANCE OPTIMIZATION TESTS');
  console.log('='.repeat(60));
  console.log('\n⚠️  Make sure dev server is running: pnpm run dev\n');
  console.log('⚠️  Update the test listing IDs in this script first!\n');
  
  try {
    // Test 1: Cache
    await testCache();
    
    // Wait before next test
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Rate limiting
    await testRateLimiting();
    
    // Wait for rate limit to reset
    console.log('\nWaiting 60 seconds for rate limit to reset...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Test 3: Concurrency
    await testConcurrency();
    
    console.log('\n✅ All tests completed!\n');
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
  }
}

main();
