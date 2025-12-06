const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 3; // Ultra small batches
const DELAY_BETWEEN_BATCHES = 20000; // 20 seconds between batches
const INTER_REQUEST_DELAY = 8000; // 8 seconds between each request
const PROGRESS_FILE = path.join(__dirname, 'alibaba-gentle-progress.json');
const MAX_CONSECUTIVE_BLOCKS = 5;
const BLOCK_COOLDOWN_MS = 300000; // 5 minutes cooldown

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
  return { offset: 0, good: 0, partial: 0, bad: 0, errors: 0, consecutiveBlocks: 0 };
}

// Save progress
function saveProgress(data) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('⚠️  Could not save progress:', err.message);
  }
}

async function retryAlibabaGentle() {
  console.log('=== GENTLE RETRY FOR BLOCKED ALIBABA LISTINGS ===\n');
  console.log('⚠️  This uses VERY slow, human-like timing to avoid blocks\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  
  // Load previous progress
  let { offset, good, partial, bad, errors, consecutiveBlocks } = loadProgress();
  
  // Setup graceful shutdown
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping gracefully...');
    isShuttingDown = true;
  });
  
  // Get only listings with 0 attributes (blocked responses)
  console.log('📊 Querying database for blocked listings...');
  const needFix = await prisma.$queryRaw`
    SELECT id, url, title
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
      )
    ORDER BY "createdAt" DESC
  `;
  
  const needFixCount = needFix.length;
  
  console.log(`Total blocked Alibaba listings (0 attrs): ${needFixCount}\n`);
  
  if (offset > 0) {
    console.log(`🔄 Resuming from offset ${offset}`);
    console.log(`Previous stats: ✅${good} ⚠️${partial} ❌${bad} Errors:${errors}\n`);
  }
  
  if (needFixCount === 0) {
    console.log('✅ No blocked listings to retry!');
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
    
    // Process batch sequentially with long delays
    let batchBlocked = 0;
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
            console.log(`⏸️  [${num}/${needFixCount}] Rate limited, pausing 30s...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            // Don't retry immediately, just mark as error
            console.log(`❌ [${num}/${needFixCount}] Skipping due to rate limit`);
            errors++;
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
          
          // Check if still blocked (fallback response)
          const isBlocked = debugSource && debugSource.includes('fallback');
          
          if (quality === 'good') {
            console.log(`✅ [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            good++;
            consecutiveBlocks = 0;
          } else if (quality === 'partial') {
            console.log(`⚠️  [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            partial++;
            consecutiveBlocks = 0;
          } else {
            if (isBlocked) {
              console.log(`🚫 [${num}/${needFixCount}] Still blocked (${debugSource}) - ${listing.title.substring(0, 40)}...`);
              bad++;
              batchBlocked++;
              consecutiveBlocks++;
            } else {
              console.log(`❌ [${num}/${needFixCount}] 0 attrs (${debugSource}) - ${listing.title.substring(0, 40)}...`);
              bad++;
              consecutiveBlocks = 0;
            }
          }
        }
      } catch (error) {
        console.log(`❌ [${num}/${needFixCount}] ERROR: ${error.message}`);
        errors++;
      }
      
      // Delay between requests within batch
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, INTER_REQUEST_DELAY));
      }
    }
    
    // Check if we're getting consistently blocked
    if (consecutiveBlocks >= MAX_CONSECUTIVE_BLOCKS) {
      console.log(`\n⚠️  🚫 Detected ${consecutiveBlocks} consecutive blocks from Alibaba.`);
      console.log(`⏸️  Taking extended cooldown: ${BLOCK_COOLDOWN_MS / 1000}s (${Math.floor(BLOCK_COOLDOWN_MS / 60000)} minutes)\n`);
      
      saveProgress({ offset: offset + batch.length, good, partial, bad, errors, consecutiveBlocks });
      await new Promise(resolve => setTimeout(resolve, BLOCK_COOLDOWN_MS));
      consecutiveBlocks = 0;
      
      console.log('✅ Extended cooldown complete, resuming...\n');
    }
    
    offset += batch.length;
    
    // Save progress after each batch
    saveProgress({ offset, good, partial, bad, errors, consecutiveBlocks });
    
    // Check if we should stop
    if (isShuttingDown) break;
    
    // Long pause between batches
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
    console.log(`✅ Good: ${good} | ⚠️  Partial: ${partial} | 🚫 Blocked: ${bad} | ⚠️  Errors: ${errors}`);
    console.log(`⏱️  Elapsed: ${Math.floor(elapsed/60)}m ${elapsed%60}s | ETA: ${Math.floor(remaining/60)}m`);
    console.log('─'.repeat(80));
  }
  
  // Clean up progress file if completed
  if (offset >= needFixCount && !isShuttingDown) {
    console.log('\n✅ All blocked listings retried!');
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
  console.log(`🚫 Still blocked (0 attributes): ${bad}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`📈 Total processed: ${offset}`);
  
  // Check remaining failures
  try {
    const stillBad = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "SavedListing"
      WHERE platform = 'ALIBABA'
        AND (
          "detailJson" IS NULL 
          OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
        )
    `;
    
    const finalGood = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "SavedListing"
      WHERE platform = 'ALIBABA'
        AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
    `;
    
    console.log(`\n🎯 Total listings with ≥10 attributes: ${Number(finalGood[0].count)}`);
    console.log(`⚠️  Still need fixing (0 attributes): ${Number(stillBad[0].count)}`);
  } catch (err) {
    console.log('\n⚠️  Could not fetch final stats (database connection issue)');
  }
  
  await prisma.$disconnect();
}

retryAlibabaGentle().catch(console.error);
