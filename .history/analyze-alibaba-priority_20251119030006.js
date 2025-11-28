const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeByPopularity() {
  console.log('Analyzing which Alibaba listings are most viewed...\n');
  
  // Get listings that are actually being viewed/searched
  const popular = await prisma.$queryRaw`
    SELECT 
      sl.id,
      sl.title,
      sl.url,
      COUNT(DISTINCT sp."poolId") as pool_count,
      sl."detailJson"
    FROM "SavedListing" sl
    LEFT JOIN "SavedProduct" sp ON sp."listingId" = sl.id
    WHERE sl.platform = 'ALIBABA'
      AND (
        sl."detailJson" IS NULL 
        OR jsonb_array_length(COALESCE(sl."detailJson"->'attributes', '[]'::jsonb)) < 10
      )
    GROUP BY sl.id
    ORDER BY pool_count DESC, sl."createdAt" DESC
    LIMIT 1000
  `;
  
  console.log(`Found ${popular.length} popular listings that need fixing`);
  console.log('\nStrategy: Fix most-viewed listings FIRST');
  console.log('- Only fix listings people actually care about');
  console.log('- May only need 10-20K out of 113K');
  console.log('- Focus on what matters\n');
  
  const inPools = popular.filter(p => p.pool_count > 0).length;
  console.log(`Listings in active pools: ${inPools}`);
  console.log(`Listings never viewed: ${popular.length - inPools}`);
  
  await prisma.$disconnect();
}

analyzeByPopularity().catch(console.error);
