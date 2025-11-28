const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const listing = await prisma.savedListing.findFirst({
    where: { image: { startsWith: '/cache/' } }
  });
  
  if (listing) {
    console.log('Image:', listing.image);
    console.log('DetailJson image:', listing.detailJson?.image);
    console.log('DetailJson images:', listing.detailJson?.images);
  } else {
    console.log('No cached image listings found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
