const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.savedListing.findMany({
    where: {
      url: {
        contains: 'Men-Cotton-Co-Ord-Shirt-and'
      }
    },
    select: {
      id: true,
      title: true,
      url: true
    },
    take: 5
  });
  
  console.log('SavedListing records:');
  console.log(JSON.stringify(listings, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
