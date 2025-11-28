const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  const listing = await prisma.savedListing.findFirst({
    where: {
      url: 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_10000028881705.html'
    }
  });
  
  if (!listing) {
    console.log('Listing not found');
    return;
  }
  
  console.log('Title:', listing.title);
  console.log('\ndetailJson keys:', listing.detailJson ? Object.keys(listing.detailJson) : 'null');
  console.log('\nFull detailJson:');
  console.log(JSON.stringify(listing.detailJson, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
