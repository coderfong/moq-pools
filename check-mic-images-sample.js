const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

prisma.savedListing.findMany({
  where: { platform: 'MADE_IN_CHINA' },
  select: { id: true, title: true, image: true },
  take: 10
})
.then(results => {
  console.log('Sample Made-in-China images:');
  results.forEach(r => {
    console.log(`\nTitle: ${r.title?.substring(0, 60)}...`);
    console.log(`Image: ${r.image || 'NULL'}`);
  });
})
.finally(() => prisma.$disconnect());
