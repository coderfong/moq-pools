const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 30; // Process 30 at a time in parallel
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches
const PROGRESS_FILE = path.join(__dirname, 'mic-fix-progress.json');
const MAX_CONSECUTIVE_FALLBACKS = 15; // Backoff after 15 consecutive failures
const BLOCK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown when blocked
const MAX_CONCURRENT_REQUESTS = 5; // 5 parallel requests - push harder
const RATE_LIMIT_BACKOFF = 8000; // 8 seconds backoff on heavy rate limiting
const INTER_CHUNK_DELAY = 100; // Only 100ms between chunks

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
  return { offset: 0, good: 0, partial: 0, bad: 0, errors: 0, consecutiveFails: 0 };
}

// Save progress
function saveProgress(data) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('⚠️  Could not save progress:', err.message);
  }
}

async function fixAllMadeInChina() {
  console.log('=== FIXING ALL MADE-IN-CHINA LISTINGS ===\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  console.log('💡 TIP: Press Ctrl+C to stop. Progress will be saved automatically.\n');
  
  // Load previous progress
  let { offset, good, partial, bad, errors, consecutiveFails } = loadProgress();
  
  // Setup graceful shutdown
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping gracefully...');
    isShuttingDown = true;
  });
  
  // Get counts
  const total = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "SavedListing" WHERE platform = 'MADE_IN_CHINA'
  `;
  const totalCount = Number(total[0].count);
  
  const needFix = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'MADE_IN_CHINA' 
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
      )
  `;
  const needFixCount = Number(needFix[0].count);
  
  console.log(`Total Made-in-China listings: ${totalCount}`);
  console.log(`Need fixing (<10 attributes): ${needFixCount}`);
  console.log(`Already good (≥10 attributes): ${totalCount - needFixCount}`);
  
  if (offset > 0) {
    console.log(`\n🔄 Resuming from offset ${offset}`);
    console.log(`Previous stats: ✅${good} ⚠️${partial} ❌${bad} Errors:${errors}\n`);
  } else {
    console.log('');
  }
  
  if (needFixCount === 0) {
    console.log('✅ All listings are already good!');
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
    const batch = await prisma.$queryRaw`
      SELECT id, url, title
      FROM "SavedListing"
      WHERE platform = 'MADE_IN_CHINA'
        AND (
          "detailJson" IS NULL 
          OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
        )
      ORDER BY "createdAt" DESC
      LIMIT ${BATCH_SIZE}
      OFFSET ${offset}
    `;
    
    if (batch.length === 0) break;
    
    // Process batch in parallel with concurrency limit and rate limit handling
    const processListing = async (listing, index) => {
      const num = offset + index + 1;
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id })
        });
        
        if (!response.ok) {
          if (response.status === 429 || response.status === 503) {
            return { success: false, type: 'ratelimit', num };
          }
          return { success: false, type: 'error', num };
        }
        
        const result = await response.json();
        
        if (!result.success) {
          return { success: false, type: 'error', num };
        } else {
          const { attributes, priceTiers, quality, debugSource } = result;
          
          if (quality === 'good') {
            console.log(`✅ [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            return { success: true, type: 'good', num, debugSource };
          } else if (quality === 'partial') {
            console.log(`⚠️  [${num}/${needFixCount}] ${attributes} attrs, ${priceTiers} tiers - ${listing.title.substring(0, 40)}...`);
            return { success: true, type: 'partial', num, debugSource };
          } else {
            console.log(`❌ [${num}/${needFixCount}] 0 attrs (${debugSource}) - ${listing.title.substring(0, 40)}...`);
            return { success: true, type: 'bad', num, debugSource };
          }
        }
      } catch (error) {
        console.log(`❌ [${num}/${needFixCount}] ERROR: ${error.message}`);
        return { success: false, type: 'error', num };
      }
    };
    
    // Process in chunks with concurrency control - stagger to avoid overwhelming when multiple scripts run
    const results = [];
    for (let i = 0; i < batch.length; i += MAX_CONCURRENT_REQUESTS) {
      const chunk = batch.slice(i, i + MAX_CONCURRENT_REQUESTS);
      const chunkResults = await Promise.all(
        chunk.map((listing, idx) => processListing(listing, i + idx))
      );
      results.push(...chunkResults);
      
      // Delay between chunks - gives other script breathing room
      if (i + MAX_CONCURRENT_REQUESTS < batch.length) {
        await new Promise(resolve => setTimeout(resolve, INTER_CHUNK_DELAY));
      }
    }
    
    // Update counters and track rate limits
    let rateLimitCount = 0;
    for (const result of results) {
      if (result.success) {
        if (result.type === 'good') {
          good++;
          consecutiveFails = 0;
        } else if (result.type === 'partial') {
          partial++;
          consecutiveFails = 0;
        } else if (result.type === 'bad') {
          bad++;
          consecutiveFails++;
          
          if (result.debugSource && result.debugSource.includes('fallback')) {
            if (consecutiveFails >= MAX_CONSECUTIVE_FALLBACKS) {
              console.log(`\n⚠️  Detected ${consecutiveFails} consecutive fallback responses (likely blocked).`);
              console.log(`⏸️  Backing off for ${BLOCK_COOLDOWN_MS / 1000}s, then continuing…\n`);
              
              saveProgress({ offset: offset + batch.length, good, partial, bad, errors, consecutiveFails });
              await new Promise(resolve => setTimeout(resolve, BLOCK_COOLDOWN_MS));
              consecutiveFails = 0;
              
              console.log('✅ Cooldown complete, resuming...\n');
            }
          }
        }
      } else {
        if (result.type === 'ratelimit') {
          rateLimitCount++;
        } else {
          errors++;
        }
      }
    }
    
    // Adaptive rate limit handling - only slow down if really hammered
    if (rateLimitCount > batch.length * 0.6) {
      console.log(`⚠️  Severe rate limiting (${rateLimitCount}/${batch.length}), backing off ${RATE_LIMIT_BACKOFF / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF));
    } else if (rateLimitCount > batch.length * 0.4) {
      console.log(`⏳ Moderate rate limiting (${rateLimitCount}/${batch.length}), short pause 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else if (rateLimitCount > 0) {
      console.log(`⚡ ${rateLimitCount} rate limits (continuing at speed)`);
    }
    
    offset += batch.length;
    
    // Save progress after each batch
    saveProgress({ offset, good, partial, bad, errors, consecutiveFails });
    
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
    const remaining = Math.floor((needFixCount - offset) / rate);
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Progress: ${offset}/${needFixCount} (${Math.floor(offset/needFixCount*100)}%)`);
    console.log(`✅ Good: ${good} | ⚠️  Partial: ${partial} | ❌ Bad: ${bad} | ⚠️  Errors: ${errors}`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Rate: ${rate.toFixed(1)}/s | ETA: ${remaining}s`);
    console.log('─'.repeat(80));
  }
  
  // Clean up progress file if completed
  if (offset >= needFixCount && !isShuttingDown) {
    console.log('\n✅ All listings processed!');
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
  
  const finalGood = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  console.log(`\n🎯 Total listings with ≥10 attributes: ${Number(finalGood[0].count)}`);
  
  await prisma.$disconnect();
}

fixAllMadeInChina().catch(console.error);
