import { prisma } from '@/lib/prisma';

async function fixBrokenCachedImages() {
  // Find listings with the broken cached image path
  const brokenHash = '3fe022221ead6a6f342f01cc79d49dcd778b321c';
  
  const listings = await prisma!.savedListing.findMany({
    where: {
      image: {
        startsWith: '/cache/' + brokenHash
      }
    },
    select: {
      id: true,
      title: true,
      image: true,
      url: true
    }
  });

  console.log(`Found ${listings.length} listings with broken cached image`);
  
  for (const listing of listings) {
    console.log(`\nListing: ${listing.title}`);
    console.log(`Current image: ${listing.image}`);
    console.log(`Source URL: ${listing.url}`);
    
    // We need to re-extract the original image URL from the source
    // For now, just reset to null so it will be re-fetched
    await prisma!.savedListing.update({
      where: { id: listing.id },
      data: { image: null }
    });
    
    console.log(`✅ Reset image to null - will be re-cached on next view`);
  }

  console.log(`\n✅ Fixed ${listings.length} broken images`);
  process.exit(0);
}

fixBrokenCachedImages();
