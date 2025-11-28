import { prisma } from '../src/lib/prisma';
import { getMadeInChinaDetailSecondImage } from '../src/lib/providers/madeinchina';
import { cacheExternalImage } from '../src/lib/imageCache';

async function quickTest() {
  console.log('Quick test: Caching 50 Made-in-China images...\n');
  
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
    take: 50
  });
  
  console.log(`Processing ${listings.length} listings...\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const listing of listings) {
    try {
      const imageUrl = await getMadeInChinaDetailSecondImage(listing.url);
      
      if (!imageUrl) {
        console.log(`⚠️  No image: ${listing.title.substring(0, 60)}...`);
        continue;
      }
      
      const { localPath } = await cacheExternalImage(imageUrl);
      
      if (!localPath) {
        console.log(`❌ Cache failed: ${listing.title.substring(0, 60)}...`);
        failed++;
        continue;
      }
      
      await prisma!.savedListing.update({
        where: { id: listing.id },
        data: { image: localPath }
      });
      
      console.log(`✅ ${listing.title.substring(0, 60)}...`);
      success++;
      
    } catch (error: any) {
      console.log(`❌ Error: ${listing.title.substring(0, 60)}... - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Success: ${success}, ❌ Failed: ${failed}`);
  process.exit(0);
}

quickTest();
