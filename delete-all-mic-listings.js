/**
 * Delete ALL Made-in-China listings from SavedListing table
 * So we can re-ingest with proper detail data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllMicListings() {
  console.log('🗑️  Deleting ALL Made-in-China listings...\n');

  const count = await prisma.savedListing.count({
    where: { platform: 'MADE_IN_CHINA' }
  });

  console.log(`Found ${count} Made-in-China listings to delete\n`);

  const result = await prisma.savedListing.deleteMany({
    where: { platform: 'MADE_IN_CHINA' }
  });

  console.log(`✅ Deleted ${result.count} Made-in-China listings!\n`);
  console.log('✨ Database is clean. Now run: pnpm mic:prime\n');
}

deleteAllMicListings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
