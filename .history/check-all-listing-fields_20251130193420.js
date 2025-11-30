/**
 * Check if original URLs are stored in the url field or elsewhere
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  // Check a sample listing to see all fields
  const listing = await prisma.savedListing.findFirst({
    where: {
      platform: 'ALIBABA',
      image: { startsWith: '/cache/' },
    },
  });

  if (!listing) {
    console.log('No listing found');
    return;
  }

  console.log('\n=== Full Listing Fields ===\n');
  console.log('All keys:', Object.keys(listing));
  console.log('\nFull listing:');
  console.log(JSON.stringify(listing, null, 2));

  // Check if we can reconstruct or fetch from URL
  console.log('\n=== Source URL ===');
  console.log('URL:', listing.url);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
