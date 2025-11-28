import { prisma } from '../src/lib/prisma';
import { getMadeInChinaDetailSecondImage } from '../src/lib/providers/madeinchina';
import { cacheExternalImage } from '../src/lib/imageCache';

async function bulkCacheMicImages() {
  console.log('Bulk caching Made-in-China images for listings with null images...\n');
  
  const BATCH_SIZE = 100;
  const CONCURRENT = 5;
  
  // Get total count
  const total = await prisma!.savedListing.count({
    where: {
      platform: 'MADE_IN_CHINA',
      image: null
    }
  });
  
  console.log(`Found ${total} Made-in-China listings with null images`);
  console.log(`Processing in batches of ${BATCH_SIZE} with ${CONCURRENT} concurrent workers\n`);
  
  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  while (processed < total) {
    // Fetch batch
    const listings = await prisma!.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: null
      },
      select: {
        id: true,
        title: true,
        url: true
      },
      take: BATCH_SIZE,
      skip: processed
    });
    
    if (listings.length === 0) break;
    
    console.log(`\nBatch ${Math.floor(processed / BATCH_SIZE) + 1}: Processing ${listings.length} listings...`);
    
    // Process in concurrent chunks
    for (let i = 0; i < listings.length; i += CONCURRENT) {
      const chunk = listings.slice(i, i + CONCURRENT);
      
      await Promise.all(
        chunk.map(async (listing) => {
          try {
            // Extract image from detail page
            const imageUrl = await getMadeInChinaDetailSecondImage(listing.url);
            
            if (!imageUrl) {
              console.log(`  ⚠️  No image: ${listing.title.substring(0, 50)}...`);
              skipped++;
              return;
            }
            
            // Cache the image
            const { localPath } = await cacheExternalImage(imageUrl);
            
            if (!localPath) {
              console.log(`  ❌ Cache failed: ${listing.title.substring(0, 50)}...`);
              failed++;
              return;
            }
            
            // Update database
            await prisma!.savedListing.update({
              where: { id: listing.id },
              data: { image: localPath }
            });
            
            console.log(`  ✅ ${listing.title.substring(0, 50)}...`);
            success++;
            
          } catch (error: any) {
            console.log(`  ❌ Error (${listing.title.substring(0, 40)}...): ${error.message}`);
            failed++;
          }
        })
      );
    }
    
    processed += listings.length;
    
    console.log(`Progress: ${processed}/${total} (${Math.round((processed/total)*100)}%)`);
    console.log(`Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
  }
  
  console.log(`\n\n=== FINAL RESULTS ===`);
  console.log(`Total processed: ${processed}`);
  console.log(`✅ Successfully cached: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped (no image found): ${skipped}`);
  
  process.exit(0);
}

bulkCacheMicImages();
