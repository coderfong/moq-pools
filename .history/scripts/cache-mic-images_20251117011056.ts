import { prisma } from '../src/lib/prisma';
import { cacheExternalImage } from '../src/lib/imageCache';

/**
 * Cache all Made-in-China external images locally
 * Converts http://image.made-in-china.com/... URLs to /cache/[hash].jpg
 */

(async () => {
  try {
    console.log('Fetching Made-in-China listings with external images...');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      },
      select: { id: true, image: true, title: true }
    });
    
    console.log(`Found ${listings.length} listings with external images to cache`);
    
    if (listings.length === 0) {
      console.log('All Made-in-China images are already cached!');
      await prisma.$disconnect();
      return;
    }
    
    let cached = 0;
    let failed = 0;
    let skipped = 0;
    const concurrency = 5; // Process 5 images at a time
    let idx = 0;
    
    const startTime = Date.now();
    
    async function worker() {
      while (idx < listings.length) {
        const i = idx++;
        const listing = listings[i];
        
        try {
          if (!listing.image) {
            skipped++;
            continue;
          }
          
          // Cache the external image
          const result = await cacheExternalImage(listing.image, { 
            preferJpgForIndiaMart: false // MIC images are usually good quality
          });
          
          if (result?.localPath) {
            // Update the database with the cached path
            await prisma.savedListing.update({
              where: { id: listing.id },
              data: { image: result.localPath }
            });
            
            cached++;
            
            if (cached % 100 === 0) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const rateNum = cached / (Date.now() - startTime) * 1000;
              const rate = rateNum.toFixed(1);
              const remaining = Math.ceil((listings.length - cached) / rateNum);
              console.log(`Progress: ${cached}/${listings.length} (${((cached/listings.length)*100).toFixed(1)}%) | ${rate} imgs/sec | ~${remaining}s remaining`);
            }
          } else {
            failed++;
            if (failed % 50 === 0) {
              console.log(`⚠️  Failed to cache: ${listing.image.slice(0, 80)}`);
            }
          }
        } catch (error: any) {
          failed++;
          if (failed <= 10) {
            console.error(`Error caching image for listing ${listing.id}:`, error.message);
          }
        }
      }
    }
    
    // Run workers in parallel
    console.log(`Starting ${concurrency} concurrent workers...\n`);
    await Promise.all(
      Array.from({ length: concurrency }, () => worker())
    );
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n=== Caching Complete ===');
    console.log(`✅ Cached: ${cached}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`📊 Average: ${(cached / totalTime).toFixed(1)} images/sec`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
