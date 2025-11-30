const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkImageQuality() {
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'ALIBABA',
      image: { startsWith: process.env.R2_PUBLIC_URL }
    },
    select: { title: true, sourceUrl: true, detailJson: true },
    take: 5
  });

  for (const listing of listings) {
    if (listing.detailJson) {
      const detail = typeof listing.detailJson === 'string' ? JSON.parse(listing.detailJson) : listing.detailJson;
      console.log('Title:', listing.title);
      console.log('HeroImage:', detail.heroImage);
      if (detail.gallery && detail.gallery.length > 0) {
        console.log('Gallery[0]:', detail.gallery[0]);
      }
      console.log('---');
    }
  }

  await prisma.$disconnect();
}

checkImageQuality().catch(console.error);
