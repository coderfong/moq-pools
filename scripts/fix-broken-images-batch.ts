import { prisma } from '@/lib/prisma';

async function fixBrokenImages() {
  console.log('Resetting 13,062 broken PNG images to null...\n');
  
  const result = await prisma!.savedListing.updateMany({
    where: {
      platform: 'MADE_IN_CHINA',
      image: { contains: '3fe022221ead6a6f342f01cc79d49dcd778b321c' }
    },
    data: {
      image: null
    }
  });
  
  console.log(`✅ Reset ${result.count} broken images to null`);
  console.log('These will be automatically re-cached when users view them\n');
  
  process.exit(0);
}

fixBrokenImages();
