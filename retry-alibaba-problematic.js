const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 3; // Small batches for problematic listings
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds between batches
const PROGRESS_FILE = path.join(__dirname, 'alibaba-retry-progress.json');
const MAX_RETRIES_PER_LISTING = 2; // Don't retry forever
const REQUEST_TIMEOUT = 90000; // 90 second timeout for difficult listings
const INTER_CHUNK_DELAY = 3000; // 3 seconds between chunks

// Categories to retry
const RETRY_CATEGORIES = {
  PARTIAL: { min: 1, max: 9, label: 'Partial (1-9 attributes)' },
  BAD: { min: 0, max: 0, label: 'Bad (0 attributes)' },
  MISSING: { min: null, max: null, label: 'Missing detailJson' }
};

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
  return { 
    offset: 0, 
    improved: 0, 
    unchanged: 0, 
    stillBad: 0, 
    errors: 0,
    category: 'PARTIAL',
    retryCount: {}
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

// Evaluate listing quality
function evaluateListing(detailJson) {
  if (!detailJson) return { category: 'MISSING', attrCount: 0 };
  
  const attrCount = Array.isArray(detailJson.attributes) ? detailJson.attributes.length : 0;
  
  if (attrCount >= 10) return { category: 'GOOD', attrCount };
  if (attrCount >= 1) return { category: 'PARTIAL', attrCount };
  return { category: 'BAD', attrCount };
}

// Fetch with timeout
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Rescrape single listing with enhanced retry logic
async function rescrapeListing(listing, retryAttempt = 1) {
  try {
    console.log(`   🔄 Attempt ${retryAttempt} for ${listing.id.slice(0, 8)}...`);
    
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        force: true
      })
    }, REQUEST_TIMEOUT);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log(`      ⏸️  Rate limited, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
        return { success: false, rateLimited: true, status: 429 };
      }
      // Try to get error details from response
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {}
      return { success: false, error: errorMsg, status: response.status };
    }
    
    const result = await response.json();
    
    if (result.success) {
      // API returns attributes count directly, not a listing object
      const attrCount = result.attributes || 0;
      const quality = result.quality || 'unknown';
      
      let category;
      if (attrCount >= 10) category = 'GOOD';
      else if (attrCount >= 1) category = 'PARTIAL';
      else category = 'BAD';
      
      return {
        success: true,
        attributes: attrCount,
        quality: quality,
        evaluation: { category, attrCount },
        improved: category === 'GOOD',
        debugSource: result.debugSource
      };
    }
    
    // More detailed error logging
    const errorMsg = result.error || result.message || 'Unknown error';
    console.log(`      ⚠️  API response: ${JSON.stringify(result).slice(0, 200)}...`);
    return { success: false, error: errorMsg };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout', timeout: true };
    }
    return { success: false, error: error.message };
  }
}

async function retryProblematicListings(category = 'PARTIAL') {
  console.log('=== RETRY PROBLEMATIC ALIBABA LISTINGS ===\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  console.log(`Target Category: ${RETRY_CATEGORIES[category].label}\n`);
  
  // Load previous progress
  let progress = loadProgress();
  let { offset, improved, unchanged, stillBad, errors, retryCount } = progress;
  
  // Setup graceful shutdown
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping gracefully...');
    isShuttingDown = true;
  });
  
  // Build query based on category and get counts
  let totalCount;
  
  if (category === 'MISSING') {
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "SavedListing" 
      WHERE platform = 'ALIBABA' 
        AND "detailJson" IS NULL
    `;
    totalCount = Number(countResult[0].count);
  } else if (category === 'BAD') {
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "SavedListing" 
      WHERE platform = 'ALIBABA' 
        AND "detailJson" IS NOT NULL
        AND (
          "detailJson"->>'attributes' IS NULL
          OR jsonb_array_length(("detailJson"->'attributes')::jsonb) = 0
        )
    `;
    totalCount = Number(countResult[0].count);
  } else { // PARTIAL
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "SavedListing" 
      WHERE platform = 'ALIBABA' 
        AND jsonb_array_length(COALESCE(("detailJson"->'attributes')::jsonb, '[]'::jsonb)) BETWEEN 1 AND 9
    `;
    totalCount = Number(countResult[0].count);
  }
  
  console.log(`Total ${RETRY_CATEGORIES[category].label}: ${totalCount}`);
  
  if (offset > 0) {
    console.log(`\n🔄 Resuming from offset ${offset}`);
    console.log(`Previous stats: ✅${improved} ➡️${unchanged} ❌${stillBad} Errors:${errors}\n`);
  } else {
    console.log('');
  }
  
  if (totalCount === 0) {
    console.log(`✅ No listings in category ${category}!`);
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    await prisma.$disconnect();
    return;
  }
  
  const startTime = Date.now();
  
  while (offset < totalCount && !isShuttingDown) {
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const batchStart = offset + 1;
    const batchEnd = Math.min(offset + BATCH_SIZE, totalCount);
    
    console.log(`\n📦 Batch ${batchNum} (${batchStart}-${batchEnd}/${totalCount})`);
    console.log(`   Progress: ${((offset / totalCount) * 100).toFixed(1)}%`);
    
    // Fetch batch based on category
    let listings;
    if (category === 'MISSING') {
      listings = await prisma.$queryRaw`
        SELECT id, title, url, "detailJson"
        FROM "SavedListing"
        WHERE platform = 'ALIBABA'
          AND "detailJson" IS NULL
        ORDER BY "updatedAt" ASC
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `;
    } else if (category === 'BAD') {
      listings = await prisma.$queryRaw`
        SELECT id, title, url, "detailJson"
        FROM "SavedListing"
        WHERE platform = 'ALIBABA'
          AND "detailJson" IS NOT NULL
          AND (
            "detailJson"->>'attributes' IS NULL
            OR jsonb_array_length(("detailJson"->'attributes')::jsonb) = 0
          )
        ORDER BY "updatedAt" ASC
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `;
    } else { // PARTIAL
      listings = await prisma.$queryRaw`
        SELECT id, title, url, "detailJson"
        FROM "SavedListing"
        WHERE platform = 'ALIBABA'
          AND jsonb_array_length(COALESCE(("detailJson"->'attributes')::jsonb, '[]'::jsonb)) BETWEEN 1 AND 9
        ORDER BY "updatedAt" ASC
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `;
    }
    
    // Process each listing in batch sequentially
    for (const listing of listings) {
      if (isShuttingDown) break;
      
      const listingId = listing.id;
      const currentRetryCount = retryCount[listingId] || 0;
      
      // Skip if already tried too many times
      if (currentRetryCount >= MAX_RETRIES_PER_LISTING) {
        console.log(`   ⏭️  Skipping ${listingId.slice(0, 8)}... (max retries reached)`);
        stillBad++;
        continue;
      }
      
      const beforeEval = evaluateListing(listing.detailJson);
      console.log(`   📊 Before: ${beforeEval.category} (${beforeEval.attrCount} attrs)`);
      
      // Try to rescrape
      let result = await rescrapeListing(listing, currentRetryCount + 1);
      
      // Handle rate limiting
      if (result.rateLimited) {
        console.log(`      Retrying after rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = await rescrapeListing(listing, currentRetryCount + 1);
      }
      
      // Update retry count
      retryCount[listingId] = currentRetryCount + 1;
      
      if (result.success) {
        const afterEval = result.evaluation;
        const afterAttrs = result.attributes || 0;
        console.log(`   📊 After: ${afterEval.category} (${afterAttrs} attrs, quality: ${result.quality})`);
        
        if (afterEval.category === 'GOOD') {
          console.log(`   ✅ Improved to GOOD!`);
          improved++;
        } else if (afterAttrs > beforeEval.attrCount) {
          console.log(`   📈 Partial improvement (+${afterAttrs - beforeEval.attrCount} attrs)`);
          unchanged++;
        } else {
          console.log(`   ➡️  No improvement`);
          unchanged++;
        }
      } else {
        console.log(`   ❌ Error: ${result.error || 'Unknown'}`);
        if (result.timeout) {
          console.log(`      (Timeout after ${REQUEST_TIMEOUT / 1000}s)`);
        }
        errors++;
      }
      
      // Delay between requests in batch
      if (listings.indexOf(listing) < listings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, INTER_CHUNK_DELAY));
      }
    }
    
    offset += listings.length;
    
    // Save progress after each batch
    saveProgress({
      offset,
      improved,
      unchanged,
      stillBad,
      errors,
      category,
      retryCount
    });
    
    // Show current stats
    const processed = offset;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = processed > 0 ? (processed / (elapsed / 60)).toFixed(1) : '0';
    
    console.log(`\n📊 Stats: ✅${improved} ➡️${unchanged} ❌${stillBad} Errors:${errors}`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Rate: ${rate}/min | Remaining: ~${Math.ceil((totalCount - offset) / (rate / 60 || 1))}min`);
    
    // Delay between batches
    if (offset < totalCount && !isShuttingDown) {
      console.log(`⏸️  Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  await prisma.$disconnect();
  
  if (isShuttingDown) {
    console.log('\n⚠️  Stopped by user. Progress saved. Run again to continue.\n');
    return;
  }
  
  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Improved to GOOD: ${improved}`);
  console.log(`➡️  Unchanged/Partial: ${unchanged}`);
  console.log(`❌ Still Bad: ${stillBad}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`📈 Total processed: ${offset}`);
  console.log(`⏱️  Total time: ${elapsed} minutes`);
  console.log('='.repeat(80));
  
  // Cleanup progress file on completion
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log('\n✨ Progress file deleted (run complete)\n');
  }
}

// Parse command line args
const args = process.argv.slice(2);
const categoryArg = args.find(arg => arg.startsWith('--category='));
const category = categoryArg ? categoryArg.split('=')[1].toUpperCase() : 'PARTIAL';

if (!RETRY_CATEGORIES[category]) {
  console.error(`❌ Invalid category: ${category}`);
  console.log('Valid categories: PARTIAL, BAD, MISSING');
  process.exit(1);
}

// Run the script
retryProblematicListings(category).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
