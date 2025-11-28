/**
 * Clean up bad Made-in-China listings from SavedListing table
 * These are listings with titles like "1/ 2", "1/ 3", "1/ 6" from old scraping
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupBadListings() {
  console.log('🔍 Searching for bad Made-in-China listings...\n');

  // Find listings with bad title patterns (e.g., "1/ 2", "1/ 3", etc.)
  const badListings = await prisma.savedListing.findMany({
    where: {
      platform: 'MADE_IN_CHINA',
      OR: [
        { title: { startsWith: '1/ ' } },
        { title: { startsWith: '2/ ' } },
        { title: { startsWith: '3/ ' } },
        { title: { startsWith: '4/ ' } },
        { title: { startsWith: '5/ ' } },
        { title: { startsWith: '6/ ' } },
        { title: { startsWith: '7/ ' } },
        { title: { startsWith: '8/ ' } },
        { title: { startsWith: '9/ ' } },
      ]
    },
    select: {
      id: true,
      title: true,
      url: true,
    }
  });

  console.log(`Found ${badListings.length} bad listings to delete\n`);

  if (badListings.length === 0) {
    console.log('✅ No bad listings found! Your database is clean.');
    return;
  }

  // Show sample of what will be deleted
  console.log('Sample of bad listings to be deleted:');
  badListings.slice(0, 5).forEach((listing, i) => {
    console.log(`${i + 1}. "${listing.title}" - ${listing.url.substring(0, 60)}...`);
  });
  console.log('');

  // Delete them
  console.log(`🗑️  Deleting ${badListings.length} bad listings...`);
  
  const result = await prisma.savedListing.deleteMany({
    where: {
      platform: 'MADE_IN_CHINA',
      OR: [
        { title: { startsWith: '1/ ' } },
        { title: { startsWith: '2/ ' } },
        { title: { startsWith: '3/ ' } },
        { title: { startsWith: '4/ ' } },
        { title: { startsWith: '5/ ' } },
        { title: { startsWith: '6/ ' } },
        { title: { startsWith: '7/ ' } },
        { title: { startsWith: '8/ ' } },
        { title: { startsWith: '9/ ' } },
      ]
    }
  });

  console.log(`\n✅ Deleted ${result.count} bad listings!`);

  // Show updated count
  const remainingCount = await prisma.savedListing.count({
    where: { platform: 'MADE_IN_CHINA' }
  });

  console.log(`\n📊 Remaining Made-in-China listings: ${remainingCount}`);
  console.log('\n✨ Cleanup complete! Refresh your products page to see the clean results.');
}

cleanupBadListings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
