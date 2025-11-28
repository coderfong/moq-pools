const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('='.repeat(80));
    console.log('DATABASE OVERVIEW');
    console.log('='.repeat(80));
    
    // Count total listings
    const total = await prisma.savedListing.count();
    console.log(`\nTotal listings: ${total}`);
    
    // Count by platform
    const platforms = await prisma.savedListing.groupBy({
      by: ['platform'],
      _count: true
    });
    
    console.log('\nListings by platform:');
    platforms.forEach(p => {
      console.log(`  ${p.platform}: ${p._count}`);
    });
    
    // Alibaba listings breakdown
    const alibabaTotal = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    const alibabaWithDetail = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        detailJson: { not: null }
      }
    });
    
    const alibabaWithoutDetail = alibabaTotal - alibabaWithDetail;
    
    console.log('\n' + '='.repeat(80));
    console.log('ALIBABA LISTINGS DETAIL');
    console.log('='.repeat(80));
    console.log(`Total Alibaba listings: ${alibabaTotal}`);
    console.log(`With detailJson: ${alibabaWithDetail}`);
    console.log(`Without detailJson: ${alibabaWithoutDetail}`);
    
    // Sample Alibaba listings
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE ALIBABA LISTINGS (first 10)');
    console.log('='.repeat(80));
    
    const samples = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      select: {
        id: true,
        title: true,
        priceRaw: true,
        url: true,
        detailJson: true,
        detailUpdatedAt: true
      },
      take: 10
    });
    
    samples.forEach((listing, i) => {
      console.log(`\n${i + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Price: ${listing.priceRaw || 'N/A'}`);
      console.log(`   Has detailJson: ${listing.detailJson !== null ? 'YES' : 'NO'}`);
      console.log(`   Detail updated: ${listing.detailUpdatedAt || 'Never'}`);
      console.log(`   URL: ${listing.url.substring(0, 80)}...`);
      
      if (listing.detailJson) {
        const detail = listing.detailJson;
        console.log(`   Detail keys: ${Object.keys(detail).join(', ')}`);
        if (detail.priceTiers) {
          console.log(`   Price tiers: ${detail.priceTiers.length}`);
        }
        if (detail.attributes) {
          console.log(`   Attributes: ${detail.attributes.length}`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
