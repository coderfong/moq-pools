import { PrismaClient } from '../prisma/generated/client4';
import { fetchProductDetail } from '../src/lib/providers/detail';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding Alibaba listings with truncated titles...\n');
  
  // Get all Alibaba listings
  const allListings = await prisma.savedListing.findMany({
    where: {
      platform: 'ALIBABA'
    },
    select: {
      id: true,
      url: true,
      title: true,
      detailJson: true
    }
  });
  
  console.log(`Total Alibaba listings: ${allListings.length}`);
  
  // Filter to those with junky/truncated titles (has .html extension or long numeric IDs)
  const needsUpdate = allListings.filter(l => {
    const title = l.title || '';
    // Check if title has file extension or long numeric IDs
    if (/\.(html?|php|asp|aspx|shtml)\b/i.test(title)) return true;
    if (/\b\d{8,}\b/.test(title)) return true;
    // Also update if no detailJson cached
    if (!l.detailJson) return true;
    return false;
  });
  
  console.log(`Listings needing update: ${needsUpdate.length}\n`);
  
  if (needsUpdate.length === 0) {
    console.log('All listings already have clean titles!');
    await prisma.$disconnect();
    return;
  }
  
  // Process in batches to avoid overwhelming the system
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
  const DELAY_BETWEEN_REQUESTS = 500; // 0.5 seconds
  
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < needsUpdate.length; i += BATCH_SIZE) {
    const batch = needsUpdate.slice(i, i + BATCH_SIZE);
    console.log(`\n=== Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needsUpdate.length / BATCH_SIZE)} ===`);
    
    for (const listing of batch) {
      console.log(`\n[${i + batch.indexOf(listing) + 1}/${needsUpdate.length}] ${listing.title}`);
      console.log(`URL: ${listing.url}`);
      
      try {
        // Fetch the full product detail
        const detail = await fetchProductDetail(listing.url);
        
        if (detail && detail.title) {
          const fullTitle = detail.title.trim();
          console.log(`✓ Full title: ${fullTitle}`);
          
          // Update the database with both the full title AND the detailJson for future use
          await prisma.savedListing.update({
            where: { id: listing.id },
            data: {
              title: fullTitle, // Update the main title field
              detailJson: detail as any, // Cache the full details
              detailUpdatedAt: new Date()
            }
          });
          
          updated++;
          console.log(`✓ Updated in database`);
        } else {
          console.log(`✗ No title found in detail page`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`✗ Error: ${error.message}`);
        failed++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
    
    // Longer delay between batches
    if (i + BATCH_SIZE < needsUpdate.length) {
      console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log('\n\n=== FINAL SUMMARY ===');
  console.log(`✓ Successfully updated: ${updated}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`⊘ Skipped (no title): ${skipped}`);
  console.log(`Total processed: ${needsUpdate.length}`);
  console.log(`\nAll listings now have full, searchable titles!`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
