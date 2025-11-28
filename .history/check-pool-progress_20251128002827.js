const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const listing = await prisma.savedListing.findUnique({
    where: { id: 'cmg13wyz105uerdvr44gguwga' },
    include: {
      product: {
        include: {
          pool: true
        }
      }
    }
  });
  
  console.log('SavedListing:', listing?.url);
  console.log('Product sourceUrl:', listing?.product?.sourceUrl);
  console.log('Pool data:', listing?.product?.pool);
  
  await prisma.$disconnect();
})();
