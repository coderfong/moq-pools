const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 5; // Very small batches for problematic items
const DELAY_BETWEEN_BATCHES = 8000; // 8 seconds between batches - more conservative
const PROGRESS_FILE = path.join(__dirname, 'mic-retry-progress.json');
const MAX_CONSECUTIVE_FALLBACKS = 5;
const BLOCK_COOLDOWN_MS = 120 * 1000; // 2 minutes cooldown
const MAX_CONCURRENT_REQUESTS = 1; // Sequential processing for retry
const RATE_LIMIT_BACKOFF = 10000; // 10 seconds backoff
const MAX_RETRIES_PER_ITEM = 2; // Try each item up to 2 times

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      console.log(`📂 Resuming from previous retry session...`);
      return data;
    }
  } catch (err) {
    console.log('⚠️  Could not load progress file, starting fresh');
  }
  return { 
    offset: 0, 
    good: 0, 
    partial: 0, 
    bad: 0, 
    errors: 0, 
    skipped: 0,
    retryAttempts: {} // Track retry attempts per ID
  };
}

// Save progress
function saveProgress(data) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('⚠️  Could not save progress:', err.message);
  }
}

async function retryProblematicListings() {
  console.log('=== RETRYING PROBLEMATIC MADE-IN-CHINA LISTINGS ===\n');
  console.log('Targeting: Errors (0 attrs with error), Bad (0 attrs), Partial (1-9 attrs)\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  console.log('💡 TIP: Press Ctrl+C to stop. Progress will be saved automatically.\n');
  
  // Load previous progress
  let progress = loadProgress();
  let { offset, good, partial, bad, errors, skipped, retryAttempts } = progress;
  
  // Setup graceful shutdown
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping gracefully...');
    isShuttingDown = true;
  });
  
  // Query for problematic listings
  console.log('🔍 Finding problematic listings...\n');
  
  const problematicListings = await prisma.$queryRaw`
    SELECT id, title, url, "detailJson"
    FROM "SavedListing" 
    WHERE platform = 'MADE_IN_CHINA' 
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
      )
    ORDER BY 
      CASE 
        WHEN "detailJson" IS NULL THEN 1
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0 THEN 2
        ELSE 3
      END,
      RANDOM()
    LIMIT 30000
  `;
  
  const totalCount = problematicListings.length;
  
  console.log(`Found ${totalCount} problematic listings to retry\n`);
  console.log('Breakdown:');
  
  const breakdown = {
    null: 0,
    zero: 0,
    partial: 0
  };
  
  problematicListings.forEach(listing => {
    if (!listing.detailJson) {
      breakdown.null++;
    } else {
      const attrs = listing.detailJson?.attributes?.length || 0;
      if (attrs === 0) breakdown.zero++;
      else breakdown.partial++;
    }
  });
  
  console.log(`  ❌ NULL (errors): ${breakdown.null}`);
  console.log(`  ❌ 0 attributes (bad): ${breakdown.zero}`);
  console.log(`  ⚠️  1-9 attributes (partial): ${breakdown.partial}`);
  
  if (totalCount === 0) {
    console.log('\n✅ No problematic listings found!');
    await prisma.$disconnect();
    return;
  }
  
  if (offset > 0) {
    console.log(`\n🔄 Resuming from offset ${offset}`);
    console.log(`Previous stats: ✅${good} ⚠️${partial} ❌${bad} Errors:${errors} Skipped:${skipped}\n`);
  }
  
  // Process in small batches
  let consecutiveFails = 0;
  let lastBlockTime = 0;
  
  for (let i = offset; i < totalCount; i += BATCH_SIZE) {
    if (isShuttingDown) {
      console.log('\n💾 Saving progress...');
      saveProgress({ offset: i, good, partial, bad, errors, skipped, retryAttempts });
      break;
    }
    
    // Check if we need to cool down after block detection
    if (lastBlockTime > 0 && Date.now() - lastBlockTime < BLOCK_COOLDOWN_MS) {
      const remaining = Math.ceil((BLOCK_COOLDOWN_MS - (Date.now() - lastBlockTime)) / 1000);
      console.log(`❄️  Cooling down... ${remaining}s remaining`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    
    const batch = problematicListings.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, totalCount)}/${totalCount})`);
    
    // Process batch sequentially
    for (const listing of batch) {
      if (isShuttingDown) break;
      
      // Check retry limit
      const attempts = retryAttempts[listing.id] || 0;
      if (attempts >= MAX_RETRIES_PER_ITEM) {
        console.log(`  ⏭️  Skipping ${listing.id} (already tried ${attempts} times)`);
        skipped++;
        continue;
      }
      
      try {
        const currentAttrs = listing.detailJson?.attributes?.length || 0;
        const statusLabel = !listing.detailJson ? '❌NULL' : 
                           currentAttrs === 0 ? '❌0' : 
                           `⚠️${currentAttrs}`;
        
        console.log(`  ${statusLabel} ${listing.id.substring(0, 8)}: ${listing.title?.substring(0, 60)}...`);
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, force: true }),
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            console.log('    ⚠️  Rate limit - backing off');
            await new Promise(r => setTimeout(r, RATE_LIMIT_BACKOFF));
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Track retry attempt
        retryAttempts[listing.id] = attempts + 1;
        
        // Debug: Log full response for troubleshooting
        if (process.env.DEBUG) {
          console.log(`    🔍 Full response:`, JSON.stringify(result).substring(0, 200));
        }
        
        if (result.success) {
          const newAttrs = result.attributes || 0;
          const debugSource = result.debugSource || 'unknown';
          const quality = result.quality || 'unknown';
          
          if (newAttrs >= 10) {
            console.log(`    ✅ Fixed! Now has ${newAttrs} attributes (${quality}, source: ${debugSource})`);
            good++;
            consecutiveFails = 0;
          } else if (newAttrs > 0) {
            console.log(`    ⚠️  Partial: ${newAttrs} attributes (${quality}, source: ${debugSource})`);
            partial++;
            consecutiveFails = 0;
          } else {
            console.log(`    ❌ Still 0 attributes (${quality}, source: ${debugSource})`);
            // Check if we're getting actual data but just no attributes
            if (result.data && Object.keys(result.data).length > 0) {
              console.log(`       Info: Has ${Object.keys(result.data).length} data fields but no attributes array`);
            }
            bad++;
            consecutiveFails++;
          }
        } else {
          console.log(`    ❌ API Error: ${result.error || 'Unknown error from API'}`);
          if (result.details) {
            console.log(`       Details: ${result.details}`);
          }
          errors++;
          consecutiveFails++;
          
          // Check for block indicators
          if (result.error?.includes('Access Denied') || 
              result.error?.includes('blocked') ||
              result.error?.includes('403')) {
            console.log('    🚫 Block detected - entering cooldown period');
            lastBlockTime = Date.now();
            consecutiveFails = 0; // Reset since we're cooling down
            break; // Exit batch
          }
        }
        
        // Back off if too many consecutive fails
        if (consecutiveFails >= MAX_CONSECUTIVE_FALLBACKS) {
          console.log(`\n⚠️  ${consecutiveFails} consecutive failures - taking a break`);
          await new Promise(r => setTimeout(r, BLOCK_COOLDOWN_MS));
          consecutiveFails = 0;
          lastBlockTime = Date.now();
        }
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err) {
        console.log(`    ❌ Error: ${err.message}`);
        errors++;
        retryAttempts[listing.id] = attempts + 1;
      }
    }
    
    // Save progress after each batch
    saveProgress({ offset: i + BATCH_SIZE, good, partial, bad, errors, skipped, retryAttempts });
    
    // Show running stats
    const processed = i + batch.length;
    const successRate = processed > 0 ? ((good / processed) * 100).toFixed(1) : '0.0';
    console.log(`  📊 Stats: ✅${good} ⚠️${partial} ❌${bad} Errors:${errors} Skipped:${skipped} | Success: ${successRate}%`);
    
    // Delay between batches
    if (i + BATCH_SIZE < totalCount && !isShuttingDown) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }
  
  // Cleanup
  if (!isShuttingDown) {
    console.log('\n✅ All problematic listings processed!');
    console.log('📂 Deleting progress file...\n');
    try {
      fs.unlinkSync(PROGRESS_FILE);
    } catch (err) {
      console.log('⚠️  Could not delete progress file');
    }
  }
  
  // Final stats
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Fixed (now ≥10 attributes): ${good}`);
  console.log(`⚠️  Still Partial (1-9 attributes): ${partial}`);
  console.log(`❌ Still Bad (0 attributes): ${bad}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`⏭️  Skipped (max retries): ${skipped}`);
  console.log(`📈 Total processed: ${good + partial + bad + errors + skipped}`);
  console.log(`🎯 Success rate: ${((good / (good + partial + bad + errors + skipped)) * 100).toFixed(1)}%`);
  
  // Check if we should run again
  const remaining = partial + bad + errors;
  if (remaining > 0 && !isShuttingDown) {
    console.log(`\n💡 ${remaining} items still need work. You can run this script again to retry.`);
  }
  
  await prisma.$disconnect();
}

// Run
retryProblematicListings().catch(err => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
