const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkPoolLinks() {
  try {
    // Get pools with product details
    const pools = await db.$queryRaw`
      SELECT p.id as "poolId", pr.id as "productId", pr.title, pr."sourceUrl"
      FROM "Pool" p
      JOIN "Product" pr ON pr.id = p."productId"
      LIMIT 5
    `;

    console.log('📊 Pool to Product Mapping:');
    console.log('━'.repeat(80));
    
    pools.forEach((pool, i) => {
      console.log(`\n${i + 1}. Pool ID: ${pool.poolId}`);
      console.log(`   Product ID: ${pool.productId}`);
      console.log(`   Title: ${pool.title}`);
      console.log(`   Source URL: ${pool.sourceUrl}`);
    });

    // Check if there are SavedListings linked to these products
    console.log('\n\n📋 Checking SavedListings linked to products:');
    console.log('━'.repeat(80));
    
    for (const pool of pools) {
      if (pool.sourceUrl) {
        const listing = await db.savedListing.findFirst({
          where: { url: pool.sourceUrl },
          select: { id: true, title: true }
        });
        
        if (listing) {
          console.log(`\n✅ Pool ${pool.poolId} → SavedListing ${listing.id}`);
          console.log(`   Title: ${listing.title}`);
          console.log(`   Link: /pools/${listing.id}`);
        } else {
          console.log(`\n⚠️  Pool ${pool.poolId} has no matching SavedListing`);
          console.log(`   Source URL: ${pool.sourceUrl}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkPoolLinks();
