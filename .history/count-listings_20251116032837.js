const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function countListings() {
  try {
    const alibabaCount = await prisma.externalListingCache.count({
      where: { platform: 'ALIBABA' }
    });

    const madeInChinaCount = await prisma.externalListingCache.count({
      where: { platform: 'MADE_IN_CHINA' }
    });

    const totalCount = await prisma.externalListingCache.count();

    console.log('\n📊 Listing Counts:');
    console.log('═'.repeat(40));
    console.log(`Alibaba.com:      ${alibabaCount.toLocaleString()}`);
    console.log(`Made-in-China:    ${madeInChinaCount.toLocaleString()}`);
    console.log('─'.repeat(40));
    console.log(`Total Listings:   ${totalCount.toLocaleString()}`);
    console.log('═'.repeat(40));

    // Also show breakdown by all platforms
    const platformCounts = await prisma.externalListingCache.groupBy({
      by: ['platform'],
      _count: { platform: true }
    });

    console.log('\n📈 All Platforms:');
    console.log('═'.repeat(40));
    platformCounts.forEach(({ platform, _count }) => {
      console.log(`${platform.padEnd(20)} ${_count.platform.toLocaleString()}`);
    });
    console.log('═'.repeat(40));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countListings();
