const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPoolFetch() {
  console.log('Testing pool listings fetch logic...\n');
  
  // Step 1: Get products with pools
  const productsWithPools = await prisma.product.findMany({
    where: {
      pool: { isNot: null },
      sourceUrl: { not: null }
    },
    select: { 
      sourceUrl: true,
      title: true,
      pool: {
        select: {
          pledgedQty: true,
          targetQty: true
        }
      }
    }
  });
  
  console.log(`Products with pools: ${productsWithPools.length}`);
  productsWithPools.forEach(p => {
    const progress = ((p.pool.pledgedQty / p.pool.targetQty) * 100).toFixed(1);
    console.log(`  - ${p.title.substring(0, 60)} (${progress}%)`);
    console.log(`    URL: ${p.sourceUrl?.substring(0, 80)}`);
  });
  
  const poolUrls = productsWithPools.map(p => p.sourceUrl).filter(Boolean);
  console.log(`\nPool URLs to fetch: ${poolUrls.length}\n`);
  
  // Step 2: Fetch SavedListings with these URLs
  if (poolUrls.length > 0) {
    const poolListings = await prisma.savedListing.findMany({
      where: {
        url: { in: poolUrls }
      },
      select: {
        id: true,
        platform: true,
        title: true,
        url: true,
      }
    });
    
    console.log(`SavedListings found: ${poolListings.length}`);
    poolListings.forEach(l => {
      console.log(`  ✅ ${l.title?.substring(0, 60)}`);
      console.log(`     Platform: ${l.platform}, ID: ${l.id}`);
    });
    
    if (poolListings.length === 0) {
      console.log('\n❌ NO SavedListings found matching pool product URLs!');
      console.log('This means the listings won\'t show on the browse page.\n');
      
      // Debug: Check if URLs match exactly
      for (const url of poolUrls) {
        console.log(`\nChecking URL: ${url?.substring(0, 100)}`);
        const listing = await prisma.savedListing.findFirst({
          where: { url: url }
        });
        if (listing) {
          console.log('  ✅ Found exact match');
        } else {
          // Try partial match
          const partial = await prisma.savedListing.findFirst({
            where: {
              url: { contains: url?.substring(30, 60) || '' }
            }
          });
          if (partial) {
            console.log(`  ⚠️  Found similar URL but not exact match:`);
            console.log(`      Listing URL: ${partial.url?.substring(0, 100)}`);
            console.log(`      Product URL: ${url?.substring(0, 100)}`);
          } else {
            console.log('  ❌ No match found at all');
          }
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

testPoolFetch().catch(console.error);
