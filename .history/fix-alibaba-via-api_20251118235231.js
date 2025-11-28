const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  
  console.log('Strategy: Use the Next.js API endpoint to re-scrape each listing');
  console.log('Make sure your dev server is running on http://localhost:3007\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    readline.question('Continue? (yes/no): ', resolve);
  });
  readline.close();
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    await prisma.$disconnect();
    return;
  }
  
  // Process in batches
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds
  
  let offset = 0;
  let fixed = 0;
  let failed = 0;
  
  while (offset < needFixCount) {
    console.log(`\n--- Batch ${Math.floor(offset / BATCH_SIZE) + 1} (${offset + 1}-${Math.min(offset + BATCH_SIZE, needFixCount)} of ${needFixCount}) ---`);
    
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
    
    for (const listing of batch) {
      try {
        console.log(`\n[${offset + 1}/${needFixCount}] ${listing.title.substring(0, 50)}...`);
        
        // Call the pool page with ?refresh=1 to force re-scrape
        const response = await fetch(`http://localhost:3007/pools/${listing.id}?refresh=1`);
        
        if (!response.ok) {
          console.log(`❌ HTTP ${response.status}`);
          failed++;
        } else {
          // Check if it was updated
          const updated = await prisma.$queryRaw`
            SELECT jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) as attr_count
            FROM "SavedListing"
            WHERE id = ${listing.id}
          `;
          
          const attrCount = Number(updated[0]?.attr_count || 0);
          
          if (attrCount >= 10) {
            console.log(`✅ SUCCESS: ${attrCount} attributes`);
            fixed++;
          } else if (attrCount > 0) {
            console.log(`⚠️  PARTIAL: ${attrCount} attributes`);
            fixed++;
          } else {
            console.log(`❌ FAILED: 0 attributes`);
            failed++;
          }
        }
        
        offset++;
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        failed++;
        offset++;
      }
    }
    
    console.log(`\n📊 Progress: ${fixed} fixed, ${failed} failed, ${offset}/${needFixCount} processed`);
  }
  
  console.log('\n\n=== FINAL RESULTS ===');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}`);
  
  await prisma.$disconnect();
}

fixAllAlibaba().catch(console.error);
