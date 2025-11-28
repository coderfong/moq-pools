const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function analyzeImages() {
  // Get some working listings (with https://...)
  const withHttp = await prisma.savedListing.findMany({
    where: {
      image: { startsWith: 'http' }
    },
    select: {
      id: true,
      title: true,
      image: true,
      url: true,
    },
    take: 5,
  });

  console.log('\n=== LISTINGS WITH REMOTE URLs (WORKING) ===');
  console.log(`Found ${withHttp.length} listings\n`);
  for (const listing of withHttp) {
    console.log(`Title: ${listing.title?.substring(0, 50)}...`);
    console.log(`Image: ${listing.image}`);
    console.log(`URL: ${listing.url}`);
    console.log('---\n');
  }

  await prisma.$disconnect();
}

analyzeImages().catch(console.error);
