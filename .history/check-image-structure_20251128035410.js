const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImage() {
  const listing = await prisma.savedListing.findUnique({
    where: { id: 'cmg13wyz105uerdvr44gguwga' }
  });
  
  console.log('image:', listing.image);
  console.log('detailJson keys:', listing.detailJson ? Object.keys(listing.detailJson) : 'null');
  
  if (listing.detailJson && listing.detailJson.imageUrls) {
    console.log('imageUrls:', listing.detailJson.imageUrls.slice(0, 2));
  }
  
  await prisma.$disconnect();
}

checkImage();
