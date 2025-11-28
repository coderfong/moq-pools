const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlibabaListings() {
  const count = await prisma.savedListing.count({
    where: { platform: 'ALIBABA' }
  });

  console.log(`\n📊 Alibaba listings in database: ${count}\n`);

  if (count > 0) {
    const samples = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      take: 3,
      select: { title: true, priceRaw: true, image: true, moq: true }
    });

    console.log('Sample Alibaba listings:');
    samples.forEach((l, i) => {
      console.log(`${i+1}. Title: ${l.title || 'MISSING'}`);
      console.log(`   Price: ${l.priceRaw || 'MISSING'}`);
      console.log(`   Image: ${l.image ? 'YES' : 'NO'}`);
      console.log(`   MOQ: ${l.moqQty || 'MISSING'}\n`);
    });
  }
}

checkAlibabaListings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
