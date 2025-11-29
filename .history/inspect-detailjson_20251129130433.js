/**
 * Inspect detailJson structure to understand image data format
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  // Get a few Alibaba listings with /cache/ images
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'ALIBABA',
      image: { startsWith: '/cache/' },
      detailJson: { not: null },
    },
    select: {
      id: true,
      url: true,
      image: true,
      detailJson: true,
    },
    take: 3,
  });

  console.log(`\n=== Inspecting ${listings.length} listings ===\n`);

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n${i + 1}. URL: ${listing.url}`);
    console.log(`   Current image: ${listing.image}`);
    console.log(`   detailJson keys:`, Object.keys(listing.detailJson || {}));
    console.log(`   detailJson (formatted):`);
    console.log(JSON.stringify(listing.detailJson, null, 2));
    console.log('\n' + '='.repeat(80));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
