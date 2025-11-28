const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the scraping functions
const { fetchProductDetailCached } = require('./src/lib/providers/detail');

async function fixAllAlibaba() {
  console.log('=== FIXING ALL ALIBABA LISTINGS ===\n');
  
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
  console.log(`Need fixing: ${needFixCount}`);
  console.log(`Already good: ${totalCount - needFixCount}\n`);
  
  // Process in batches
  const BATCH_SIZE = 50;
  const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds
  const DELAY_BETWEEN_ITEMS = 2000; // 2 seconds
  
  let offset = 0;
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  
  while (offset < needFixCount) {
    console.log(`\n--- Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${offset + 1}-${Math.min(offset + BATCH_SIZE, needFixCount)} of ${needFixCount}) ---`);
    
    // Get next batch of listings to fix
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
    
    for (const listing of batch) {
      try {
        console.log(`\n[${offset + 1}/${needFixCount}] ${listing.title.substring(0, 60)}...`);
        console.log(`URL: ${listing.url}`);
        
        // Force refresh by scraping the detail
        const detail = await fetchProductDetailCached(listing.url, true); // true = force refresh
        
        if (!detail) {
          console.log('❌ No detail returned');
          failed++;
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
          continue;
        }
        
        const attrCount = detail.attributes ? detail.attributes.length : 0;
        const tierCount = detail.priceTiers ? detail.priceTiers.length : 0;
        
        if (attrCount >= 10) {
          console.log(`✅ SUCCESS: ${attrCount} attributes, ${tierCount} price tiers`);
          fixed++;
        } else if (attrCount > 0) {
          console.log(`⚠️  PARTIAL: ${attrCount} attributes, ${tierCount} price tiers`);
          fixed++;
        } else {
          console.log(`❌ FAILED: 0 attributes (fallback data)`);
          failed++;
        }
        
        // Update the database
        await prisma.$executeRaw`
          UPDATE "SavedListing"
          SET "detailJson" = ${JSON.stringify(detail)}::jsonb,
              "detailUpdatedAt" = NOW()
          WHERE id = ${listing.id}
        `;
        
        offset++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        failed++;
        offset++;
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
      }
    }
    
    // Delay between batches
    if (offset < needFixCount) {
      console.log(`\n⏸️  Pausing ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
    
    // Progress report
    console.log(`\n📊 Progress: ${fixed} fixed, ${failed} failed, ${offset}/${needFixCount} processed`);
  }
  
  console.log('\n\n=== FINAL RESULTS ===');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total processed: ${offset}`);
  
  // Final stats
  const finalGood = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  console.log(`\n🎯 Listings with 10+ attributes: ${Number(finalGood[0].count)}`);
  
  await prisma.$disconnect();
}

fixAllAlibaba().catch(console.error);
