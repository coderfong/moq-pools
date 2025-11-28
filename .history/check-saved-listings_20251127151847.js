const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSavedListings() {
  console.log('Checking if pool products have SavedListings...\n');
  
  // Get products with pools
  const products = await prisma.product.findMany({
    where: {
      pool: { isNot: null }
    },
    include: {
      pool: true
    }
  });
  
  console.log(`Products with pools: ${products.length}\n`);
  
  for (const product of products) {
    console.log(`Product: ${product.title?.substring(0, 70)}`);
    console.log(`  sourceUrl: ${product.sourceUrl}`);
    console.log(`  Pool progress: ${product.pool.pledgedQty}/${product.pool.targetQty} (${((product.pool.pledgedQty / product.pool.targetQty) * 100).toFixed(1)}%)`);
    
    if (product.sourceUrl) {
      // Check if there's a SavedListing with this URL
      const savedListing = await prisma.savedListing.findFirst({
        where: {
          url: product.sourceUrl
        }
      });
      
      if (savedListing) {
        console.log(`  ✅ SavedListing EXISTS (ID: ${savedListing.id})`);
        console.log(`     Platform: ${savedListing.platform}`);
        console.log(`     Title: ${savedListing.title?.substring(0, 60)}`);
      } else {
        console.log(`  ❌ NO SavedListing found for this URL`);
        console.log(`     This product won't show as an external listing on browse page`);
      }
    } else {
      console.log(`  ❌ NO sourceUrl - can't match to SavedListing`);
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkSavedListings().catch(console.error);
