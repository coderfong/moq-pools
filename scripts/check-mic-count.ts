import { prisma } from '@/lib/prisma';

async function checkCounts() {
  const total = await prisma!.savedListing.count({
    where: { platform: 'MADE_IN_CHINA' }
  });
  
  const withImages = await prisma!.savedListing.count({
    where: {
      platform: 'MADE_IN_CHINA',
      image: { not: null }
    }
  });
  
  const withoutImages = await prisma!.savedListing.count({
    where: {
      platform: 'MADE_IN_CHINA',
      image: null
    }
  });
  
  const withBrokenPng = await prisma!.savedListing.count({
    where: {
      platform: 'MADE_IN_CHINA',
      image: { contains: '3fe022221ead6a6f342f01cc79d49dcd778b321c' }
    }
  });
  
  console.log('Made-in-China Listings:');
  console.log(`Total: ${total}`);
  console.log(`With images: ${withImages}`);
  console.log(`Without images (null): ${withoutImages}`);
  console.log(`With broken PNG: ${withBrokenPng}`);
  
  process.exit(0);
}

checkCounts();
