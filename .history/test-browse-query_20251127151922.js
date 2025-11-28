const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBrowseQuery() {
  console.log('Testing browse page query...\n');
  
  // Simulate the browse page query
  const platform = 'ALL';
  const q = '';
  
  // Get SavedListings (simulating querySavedListings)
  const savedListings = await prisma.savedListing.findMany({
    where: {
      // No platform filter for ALL
    },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total SavedListings fetched: ${savedListings.length}\n`);
  
  // Check if our pool listings are in there
  const poolListingIds = [
    'cmg13wyz105uerdvr44gguwga', // Batter Dispenser
    'cmhkiqy0q0dbkblx71ku2nais'  // Polar Camera
  ];
  
  for (const id of poolListingIds) {
    const found = savedListings.find(l => l.id === id);
    if (found) {
      console.log(`✅ Found: ${found.title?.substring(0, 60)}`);
      console.log(`   Platform: ${found.platform}`);
      console.log(`   Created: ${found.createdAt}`);
    } else {
      console.log(`❌ NOT in first 50 results: ${id}`);
    }
  }
  
  console.log('\n--- Checking if they exist at all ---\n');
  
  for (const id of poolListingIds) {
    const listing = await prisma.savedListing.findUnique({
      where: { id }
    });
    if (listing) {
      console.log(`✅ Listing exists: ${listing.title?.substring(0, 60)}`);
      console.log(`   URL: ${listing.url?.substring(0, 80)}`);
      
      // Check if there's a product with pool pointing to this
      const product = await prisma.product.findFirst({
        where: { sourceUrl: listing.url },
        include: { pool: true }
      });
      
      if (product && product.pool) {
        console.log(`   ✅ Has pool: ${product.pool.pledgedQty}/${product.pool.targetQty}`);
      }
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

testBrowseQuery().catch(console.error);
