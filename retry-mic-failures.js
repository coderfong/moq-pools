const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 5; // Smaller batches for retry
const DELAY_BETWEEN_BATCHES = 8000; // 8 seconds between batches
const PROGRESS_FILE = path.join(__dirname, 'mic-retry-progress.json');
const INTER_REQUEST_DELAY = 2000; // 2 seconds between each request

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      console.log(`📂 Resuming from previous session...`);
      return data;
    }
  } catch (err) {
    console.log('⚠️  Could not load progress file, starting fresh');
  }
  return { offset: 0, good: 0, partial: 0, bad: 0, errors: 0 };
}

// Save progress
function saveProgress(data) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('⚠️  Could not save progress:', err.message);
  }
}

async function retryMICFailures() {
  console.log('=== RETRYING FAILED MADE-IN-CHINA LISTINGS ===\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  console.log('💡 This will retry listings with 0 attributes or errors\n');
  
  // Load previous progress
  let { offset, good, partial, bad, errors } = loadProgress();
  
  // Setup graceful shutdown
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping gracefully...');
    isShuttingDown = true;
  });
  
  // Get listings that still need fixing (0 attributes only)
  const needFix = await prisma.$queryRaw`
    SELECT id, url, title
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
      )
    ORDER BY "createdAt" DESC
  `;
  
  const needFixCount = needFix.length;
  
  console.log(`Total listings with 0 attributes: ${needFixCount}`);
  
  if (offset > 0) {
    console.log(`\n🔄 Resuming from offset ${offset}`);
    console.log(`Previous stats: ✅${good} ⚠️${partial} ❌${bad} Errors:${errors}\n`);
  }
  
  if (needFixCount === 0) {
    console.log('✅ No failed listings to retry!');
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    await prisma.$disconnect();
    return;
  }
  
  const startTime = Date.now();
  
  while (offset < needFixCount && !isShuttingDown) {
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const batchStart = offset + 1;
    const batchEnd = Math.min(offset + BATCH_SIZE, needFixCount);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`BATCH ${batchNum} (${batchStart}-${batchEnd} of ${needFixCount})`);
    console.log('='.repeat(80));
    
    // Get next batch
    const batch = needFix.slice(offset, offset + BATCH_SIZE);
    
    if (batch.length === 0) break;
    
    // Process batch sequentially with delays (very gentle)
    for (let i = 0; i < batch.length; i++) {
      if (isShuttingDown) break;
      
      const listing = batch[i];
      const num = offset + i + 1;
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id })
        });
        
        if (!response.ok) {
          if (response.status === 429 || response.status === 503) {
            console.log(`⏸️  [${num}/${needFixCount}] Rate limited, pausing 15s...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            // Retry once
            const retryResponse = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listingId: listing.id })
            });
            if (!retryResponse.ok) {
              console.log(`❌ [${num}/${needFixCount}] Still rate limited after retry`);
              errors++;
              continue;
            }
            const retryResult = await retryResponse.json();
            if (!retryResult.success) {
              console.log(`❌ [${num}/${needFixCount}] Failed after retry`);
              errors++;
            } else {
              const { attributes, priceTiers, quality, debugSource } = retryResult;
              if (quality === 'good') {
                console.log(`✅ [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers (retry) - ${listing.title.substring(0, 40)}...`);
                good++;
              } else if (quality === 'partial') {
                console.log(`⚠️  [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers (retry) - ${listing.title.substring(0, 40)}...`);
                partial++;
              } else {
                console.log(`❌ [${num}/${needFixCount}] 0 attrs (${debugSource}, retry) - ${listing.title.substring(0, 40)}...`);
                bad++;
              }
            }
          } else {
            console.log(`❌ [${num}/${needFixCount}] HTTP ${response.status}`);
            errors++;
          }
          continue;
        }
        
        const result = await response.json();
        
        if (!result.success) {
          console.log(`❌ [${num}/${needFixCount}] API error - ${listing.title.substring(0, 40)}...`);
          errors++;
        } else {
          const { attributes, priceTiers, quality, debugSource } = result;
          
          if (quality === 'good') {
            console.log(`✅ [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            good++;
          } else if (quality === 'partial') {
            console.log(`⚠️  [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            partial++;
          } else {
            console.log(`❌ [${num}/${needFixCount}] 0 attrs (${debugSource}) - ${listing.title.substring(0, 40)}...`);
            bad++;
          }
        }
      } catch (error) {
        console.log(`❌ [${num}/${needFixCount}] ERROR: ${error.message}`);
        errors++;
      }
      
      // Delay between requests
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, INTER_REQUEST_DELAY));
      }
    }
    
    offset += batch.length;
    
    // Save progress after each batch
    saveProgress({ offset, good, partial, bad, errors });
    
    // Check if we should stop
    if (isShuttingDown) break;
    
    // Longer pause between batches
    if (offset < needFixCount) {
      console.log(`\n⏸️  Pausing ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
    
    // Progress summary
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const rate = offset / elapsed;
    const remaining = rate > 0 ? Math.floor((needFixCount - offset) / rate) : 0;
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Progress: ${offset}/${needFixCount} (${Math.floor(offset/needFixCount*100)}%)`);
    console.log(`✅ Good: ${good} | ⚠️  Partial: ${partial} | ❌ Bad: ${bad} | ⚠️  Errors: ${errors}`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Rate: ${rate.toFixed(2)}/s | ETA: ${remaining}s`);
    console.log('─'.repeat(80));
  }
  
  // Clean up progress file if completed
  if (offset >= needFixCount && !isShuttingDown) {
    console.log('\n✅ All failed listings retried!');
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('📂 Progress file deleted.\n');
    }
  } else if (isShuttingDown) {
    console.log('\n💾 Progress saved. Run the script again to resume.\n');
  }
  
  // Final stats
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Good (≥10 attributes): ${good}`);
  console.log(`⚠️  Partial (1-9 attributes): ${partial}`);
  console.log(`❌ Bad (0 attributes): ${bad}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`📈 Total processed: ${offset}`);
  
  // Check remaining failures
  const stillBad = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
      )
  `;
  
  const finalGood = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  
  console.log(`\n🎯 Total listings with ≥10 attributes: ${Number(finalGood[0].count)}`);
  console.log(`⚠️  Still need fixing (0 attributes): ${Number(stillBad[0].count)}`);
  
  await prisma.$disconnect();
}

retryMICFailures().catch(console.error);
