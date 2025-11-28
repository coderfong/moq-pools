const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkAlibabaData() {
  try {
    const listings = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      select: {
        id: true,
        title: true,
        priceRaw: true,
        detailJson: true,
        detailUpdatedAt: true,
        url: true
      },
      take: 10
    });

    console.log('Total Alibaba listings checked:', listings.length);
    console.log('\n' + '='.repeat(80) + '\n');

    listings.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title.substring(0, 60)}...`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Price: ${item.priceRaw || 'N/A'}`);
      console.log(`   Has detailJson: ${item.detailJson !== null}`);
      console.log(`   Detail updated: ${item.detailUpdatedAt || 'Never'}`);
      if (item.detailJson) {
        const keys = Object.keys(item.detailJson);
        console.log(`   Detail keys: ${keys.join(', ')}`);
      }
      console.log(`   URL: ${item.url.substring(0, 80)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlibabaData();
