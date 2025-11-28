import { prisma } from '../src/lib/prisma';
import { cacheExternalImage } from '../src/lib/imageCache';

/**
 * Retry caching failed Made-in-China images with better error handling
 * 
 * Usage:
 *   pnpm tsx scripts/retry-failed-images.ts
 */

(async () => {
  if (!prisma) {
    console.error('ERROR: Prisma client not available. Check DATABASE_URL.');
    process.exit(1);
  }
  
  try {
    console.log('Fetching failed Made-in-China listings...');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      },
      select: { id: true, image: true, title: true }
    });
    
    console.log(`Found ${listings.length} listings with uncached images\n`);
    
    if (listings.length === 0) {
      console.log('All images are cached!');
      await prisma.$disconnect();
      return;
    }
    
    let cached = 0;
    let failed = 0;
    let skipped = 0;
    const failureReasons: Record<string, number> = {};
    const concurrency = 3; // Reduce concurrency to avoid rate limiting
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
          
          // Add small delay to avoid rate limiting
          if (idx % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Cache the external image with retry logic
          let retries = 3;
          let lastError: any = null;
          let success = false;
          
          while (retries > 0 && !success) {
            try {
              const result = await cacheExternalImage(listing.image, { 
                preferJpgForIndiaMart: false
              });
              
              if (result?.localPath) {
                // Update the database with the cached path
                await prisma.savedListing.update({
                  where: { id: listing.id },
                  data: { image: result.localPath }
                });
                
                cached++;
                success = true;
                
                if (cached % 50 === 0) {
                  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                  const rateNum = cached / (Date.now() - startTime) * 1000;
                  const rate = rateNum.toFixed(1);
                  const remaining = Math.ceil((listings.length - cached - failed) / rateNum);
                  console.log(`✅ Progress: ${cached}/${listings.length} | Failed: ${failed} | ${rate} imgs/sec | ~${remaining}s remaining`);
                }
              } else {
                throw new Error('No localPath returned');
              }
            } catch (error: any) {
              lastError = error;
              retries--;
              if (retries > 0) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
              }
            }
          }
          
          if (!success) {
            failed++;
            const reason = lastError?.message || 'Unknown error';
            failureReasons[reason] = (failureReasons[reason] || 0) + 1;
            
            if (failed <= 20 || failed % 100 === 0) {
              console.log(`❌ Failed (${retries === 0 ? 'after retries' : 'no retries'}): ${reason}`);
            }
          }
        } catch (error: any) {
          failed++;
          const reason = error?.message || 'Unknown error';
          failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        }
      }
    }
    
    // Run workers in parallel
    console.log(`Starting ${concurrency} concurrent workers with retry logic...\n`);
    await Promise.all(
      Array.from({ length: concurrency }, () => worker())
    );
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalTimeNum = (Date.now() - startTime) / 1000;
    
    console.log('\n=== Retry Complete ===');
    console.log(`✅ Successfully cached: ${cached}`);
    console.log(`❌ Still failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`📊 Average: ${(cached / totalTimeNum).toFixed(1)} images/sec`);
    
    if (Object.keys(failureReasons).length > 0) {
      console.log('\n=== Failure Reasons ===');
      Object.entries(failureReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          console.log(`  ${reason}: ${count}`);
        });
    }
    
    // Final stats
    const stillFailed = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      }
    });
    
    const nowCached = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: '/cache/' }
      }
    });
    
    const total = await prisma.savedListing.count({
      where: { platform: 'MADE_IN_CHINA' }
    });
    
    console.log('\n=== Final Statistics ===');
    console.log(`Total MIC listings: ${total}`);
    console.log(`Cached: ${nowCached} (${((nowCached/total)*100).toFixed(1)}%)`);
    console.log(`Still external: ${stillFailed} (${((stillFailed/total)*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
