const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const savedListingId = 'cmg13wyz105uerdvr44gguwga';
    
    console.log('1. Finding saved listing...');
    const savedListing = await prisma.savedListing.findUnique({
      where: { id: savedListingId },
      select: { url: true }
    });
    console.log('SavedListing:', savedListing);
    
    if (!savedListing) {
      console.log('❌ Listing not found');
      return;
    }
    
    console.log('\n2. Finding product with sourceUrl:', savedListing.url);
    const product = await prisma.product.findFirst({
      where: { sourceUrl: savedListing.url },
      include: {
        pool: true
      }
    });
    console.log('Product found:', !!product);
    console.log('Pool found:', !!product?.pool);
    
    if (product?.pool) {
      console.log('\n3. Pool data:');
      const result = {
        pledgedQty: product.pool.pledgedQty,
        targetQty: product.pool.targetQty,
        status: product.pool.status,
        moqReachedAt: product.pool.moqReachedAt,
        deadlineAt: product.pool.deadlineAt
      };
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n3. No pool found, would return defaults');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
