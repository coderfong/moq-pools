const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const listing = await prisma.savedListing.findUnique({
    where: { id: 'cmg13wyz105uerdvr44gguwga' },
    select: { 
      url: true,
      title: true,
      moq: true 
    }
  });
  
  console.log('SavedListing:', listing);
  
  if (listing) {
    const product = await prisma.product.findFirst({
      where: { sourceUrl: listing.url },
      include: {
        pool: true
      }
    });
    
    console.log('\nProduct:', product?.title);
    console.log('Product sourceUrl:', product?.sourceUrl);
    console.log('\nPool data:', product?.pool);
    
    if (product?.pool) {
      console.log('\n✅ Pool Progress:');
      console.log(`Pledged: ${product.pool.pledgedQty}`);
      console.log(`Target: ${product.pool.targetQty}`);
      console.log(`Status: ${product.pool.status}`);
      console.log(`Progress: ${product.pool.pledgedQty}/${product.pool.targetQty} (${Math.round(product.pool.pledgedQty / product.pool.targetQty * 100)}%)`);
    }
  }
  
  await prisma.$disconnect();
})();
