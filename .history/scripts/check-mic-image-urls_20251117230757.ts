import { prisma } from '@/lib/prisma';

async function checkMICImages() {
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'MADE_IN_CHINA'
    },
    take: 10,
    select: {
      title: true,
      imageUrl: true
    }
  });

  console.log('Sample Made-in-China image URLs:');
  listings.forEach((l: any, i: number) => {
    console.log(`${i + 1}. ${l.imageUrl}`);
  });

  process.exit(0);
}

checkMICImages();
