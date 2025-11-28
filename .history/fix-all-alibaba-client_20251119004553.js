const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3007/api/rescrape';
const BATCH_SIZE = 3; // Reduced from 5 to avoid rate limiting
const DELAY_BETWEEN_REQUESTS = 0; // No delay between requests
const DELAY_BETWEEN_BATCHES = 0; // No pause between batches

async function fixAllAlibaba() {
  console.log('=== FIXING ALL ALIBABA LISTINGS ===\n');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  
  // Get counts
  const total = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "SavedListing" WHERE platform = 'ALIBABA'
  `;
  const totalCount = Number(total[0].count);
  
  const needFix = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'ALIBABA' 
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
      )
  `;
  const needFixCount = Number(needFix[0].count);
  
  console.log(`Total Alibaba listings: ${totalCount}`);
  console.log(`Need fixing (<10 attributes): ${needFixCount}`);
  console.log(`Already good (≥10 attributes): ${totalCount - needFixCount}\n`);
  
  if (needFixCount === 0) {
    console.log('✅ All listings are already good!');
    await prisma.$disconnect();
    return;
  }
  
  let offset = 0;
  let good = 0;
  let partial = 0;
  let bad = 0;
  let errors = 0;
  
  const startTime = Date.now();
  
  while (offset < needFixCount) {
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
      WHERE platform = 'ALIBABA'
        AND (
          "detailJson" IS NULL 
          OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
        )
      ORDER BY "createdAt" DESC
      LIMIT ${BATCH_SIZE}
      OFFSET ${offset}
    `;
    
    if (batch.length === 0) break;
    
    for (let i = 0; i < batch.length; i++) {
      const listing = batch[i];
      const num = offset + i + 1;
      
      console.log(`\n[${num}/${needFixCount}] ${listing.title.substring(0, 60)}...`);
      console.log(`URL: ${listing.url.substring(0, 80)}...`);
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id })
        });
        
        if (!response.ok) {
          console.log(`❌ HTTP ${response.status}`);
          if (response.status === 429 || response.status === 503) {
            console.log('⚠️  Rate limited! Waiting 30 seconds...');
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
          errors++;
          continue;
        }
        
        const result = await response.json();
        
        if (!result.success) {
          console.log(`❌ FAILED: ${result.error || 'Unknown error'}`);
          errors++;
        } else {
          const { attributes, priceTiers, quality, debugSource } = result;
          
          if (quality === 'good') {
            console.log(`✅ GOOD: ${attributes} attributes, ${priceTiers} tiers`);
            good++;
          } else if (quality === 'partial') {
            console.log(`⚠️  PARTIAL: ${attributes} attributes, ${priceTiers} tiers`);
            partial++;
          } else {
            console.log(`❌ BAD: 0 attributes (${debugSource})`);
            // If we're getting too many fallback responses, slow down more
            if (debugSource && debugSource.includes('fallback')) {
              bad++;
              // Every 5 failures in a row, add extra delay
              if (bad % 5 === 0) {
                console.log('⚠️  Multiple fallbacks detected, adding 10s delay...');
                await new Promise(resolve => setTimeout(resolve, 10000));
              }
            } else {
              bad++;
            }
          }
        }
        
        // Rate limiting
        if (i < batch.length - 1 || offset + BATCH_SIZE < needFixCount) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        errors++;
      }
    }
    
    offset += batch.length;
    
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
    WHERE platform = 'ALIBABA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  console.log(`\n🎯 Total listings with ≥10 attributes: ${Number(finalGood[0].count)}`);
  
  await prisma.$disconnect();
}

fixAllAlibaba().catch(console.error);
