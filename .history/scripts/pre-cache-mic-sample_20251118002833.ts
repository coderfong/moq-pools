import { prisma } from '../src/lib/prisma';
import { getMadeInChinaDetailSecondImage } from '../src/lib/providers/madeinchina';
import { cacheExternalImage } from '../src/lib/imageCache';

async function preCacheSample() {
  console.log('Pre-caching sample of Made-in-China listings with null images...\n');
  
  // Get first 10 listings with null images
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
    take: 10
  });
  
  console.log(`Found ${listings.length} listings to test\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const listing of listings) {
    console.log(`Testing: ${listing.title.substring(0, 60)}...`);
    
    try {
      // Extract image from detail page
      const imageUrl = await getMadeInChinaDetailSecondImage(listing.url);
      
      if (!imageUrl) {
        console.log('  ❌ No image found on detail page');
        failed++;
        continue;
      }
      
      console.log(`  Found: ${imageUrl}`);
      
      // Cache the image
      const { localPath } = await cacheExternalImage(imageUrl);
      
      if (!localPath) {
        console.log('  ❌ Failed to cache image');
        failed++;
        continue;
      }
      
      // Update database
      await prisma!.savedListing.update({
        where: { id: listing.id },
        data: { image: localPath }
      });
      
      console.log(`  ✅ Cached to: ${localPath}`);
      success++;
      
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  console.log(`\nResults: ${success} successful, ${failed} failed out of ${listings.length} total`);
  process.exit(0);
}

preCacheSample();
