const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSample() {
  const listing = await prisma.savedListing.findFirst({
    where: {
      platform: 'MADE_IN_CHINA',
      url: { not: null }
    }
  });
  
  console.log('Sample listing:');
  console.log('Title:', listing.title);
  console.log('URL:', listing.url);
  console.log('Current image:', listing.image);
  
  await prisma.$disconnect();
}

checkSample();
