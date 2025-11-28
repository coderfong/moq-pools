const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get a few listings with cache paths
  const listings = await prisma.savedListing.findMany({
    where: { image: { startsWith: '/cache/' } },
    take: 3,
    select: {
      id: true,
      url: true,
      image: true,
      platform: true,
      detailJson: true
    }
  });
  
  console.log(JSON.stringify(listings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
