// Fix Alibaba listings by calling the API endpoint
const BASE_URL = 'http://localhost:3007';

async function analyzeListings() {
  console.log('Analyzing Alibaba listings...\n');
  
  const response = await fetch(`${BASE_URL}/api/fix-alibaba?action=analyze`);
  const data = await response.json();
  
  console.log('='.repeat(80));
  console.log('ANALYSIS RESULTS');
  console.log('='.repeat(80));
  console.log(`Total Alibaba listings: ${data.total}`);
  console.log(`✅ Good listings: ${data.good}`);
  console.log(`❌ Need fixing: ${data.needsFix}`);
  
  if (data.samples && data.samples.length > 0) {
    console.log('\nSample listings that need fixing:');
    data.samples.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title || item.id}`);
      console.log(`   Reason: ${item.reason}`);
    });
  }
  
  return data.needsFix;
}

async function fixListings(batchSize = 5) {
  console.log(`\nFixing listings in batches of ${batchSize}...\n`);
  
  let totalFixed = 0;
  let totalFailed = 0;
  let batch = 1;
  
  // Keep fixing until no more listings need fixing
  while (true) {
    console.log(`\nBatch ${batch}: Fetching next ${batchSize} listings...`);
    
    const response = await fetch(`${BASE_URL}/api/fix-alibaba?action=fix&limit=${batchSize}`);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log('No more listings to fix!');
      break;
    }
    
    console.log(`Processing ${data.results.length} listings...\n`);
    
    data.results.forEach((result, i) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${i + 1}. Fixed - ${result.attributes} attributes, ${result.priceTiers} tiers`);
        totalFixed++;
      } else if (result.status === 'weak') {
        console.log(`  ⚠️  ${i + 1}. ${result.message}`);
        totalFailed++;
      } else {
        console.log(`  ❌ ${i + 1}. Error: ${result.message}`);
        totalFailed++;
      }
    });
    
    console.log(`\nBatch ${batch} complete. Fixed: ${totalFixed}, Failed: ${totalFailed}`);
    
    batch++;
    
    // Rate limit: wait 3 seconds between batches
    if (data.results.length === batchSize) {
      console.log('Waiting 3 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Last batch was smaller than requested, we're done
      break;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log('\n✨ Done!\n');
}

async function main() {
  try {
    const needsFix = await analyzeListings();
    
    if (needsFix === 0) {
      console.log('\n✅ All listings are good!\n');
      return;
    }
    
    console.log('\n' + '='.repeat(80));
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(`\nDo you want to fix ${needsFix} listings? (yes/no): `, async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await fixListings(5); // Process 5 at a time
      } else {
        console.log('Cancelled.');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
