const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeDeletion() {
  console.log('Analyzing which Alibaba listings could be deleted...\n');
  
  // Find listings that:
  // - Have no details
  // - Are not in any pool
  // - Have never been clicked
  
  const unused = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing" sl
    WHERE sl.platform = 'ALIBABA'
      AND (
        sl."detailJson" IS NULL 
        OR jsonb_array_length(COALESCE(sl."detailJson"->'attributes', '[]'::jsonb)) < 10
      )
      AND NOT EXISTS (
        SELECT 1 FROM "SavedProduct" sp 
        WHERE sp."listingId" = sl.id
      )
  `;
  
  const unusedCount = Number(unused[0].count);
  
  console.log(`Listings with no details AND not in any pool: ${unusedCount}`);
  console.log('\nYou could DELETE these to reduce the problem from');
  console.log(`113,662 → ${113662 - unusedCount} listings\n`);
  
  console.log('This would:');
  console.log('✅ Reduce database size');
  console.log('✅ Focus on listings people actually saved');
  console.log('✅ Make scraping manageable');
  console.log('❌ Lose some search results (but no one uses them anyway)');
  
  await prisma.$disconnect();
}

analyzeDeletion().catch(console.error);
