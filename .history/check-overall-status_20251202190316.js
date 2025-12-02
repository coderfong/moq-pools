const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkStatus() {
  try {
    console.log('\n=== OVERALL DATABASE STATUS ===\n');
    
    // Count by platform
    const platformStats = await prisma.savedListing.groupBy({
      by: ['platform'],
      _count: { _all: true }
    });
    
    console.log('📊 Listings by Platform:');
    let totalListings = 0;
    platformStats.forEach(s => {
      const count = s._count._all;
      totalListings += count;
      console.log(`  ${s.platform}: ${count.toLocaleString()}`);
    });
    console.log(`  TOTAL: ${totalListings.toLocaleString()}\n`);
    
    // Image status
    const withImage = await prisma.savedListing.count({
      where: {
        image: { not: null },
        NOT: { image: '' }
      }
    });
    
    const noImage = await prisma.savedListing.count({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    console.log('🖼️  Image Status:');
    console.log(`  With images: ${withImage.toLocaleString()} (${(withImage/totalListings*100).toFixed(1)}%)`);
    console.log(`  Without images: ${noImage.toLocaleString()} (${(noImage/totalListings*100).toFixed(1)}%)\n`);
    
    // Check for bad/missing data by platform
    console.log('⚠️  Issues by Platform:\n');
    
    for (const stat of platformStats) {
      const platform = stat.platform;
      
      const missing = await prisma.savedListing.count({
        where: {
          platform,
          OR: [
            { image: null },
            { image: '' },
            { title: null },
            { title: '' }
          ]
        }
      });
      
      const total = stat._count._all;
      const percent = (missing / total * 100).toFixed(1);
      
      if (missing > 0) {
        console.log(`  ${platform}: ${missing.toLocaleString()}/${total.toLocaleString()} (${percent}%) have issues`);
      }
    }
    
    // Check detailJson status for ALIBABA
    console.log('\n📄 Alibaba detailJson Status:');
    const alibabaTotal = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    const alibabaWithDetail = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        detailJson: { not: null }
      }
    });
    
    console.log(`  With detailJson: ${alibabaWithDetail.toLocaleString()}/${alibabaTotal.toLocaleString()} (${(alibabaWithDetail/alibabaTotal*100).toFixed(1)}%)`);
    
    // Check Made-in-China detailJson status
    console.log('\n📄 Made-in-China detailJson Status:');
    const micTotal = await prisma.savedListing.count({
      where: { platform: 'MADE_IN_CHINA' }
    });
    
    const micWithDetail = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        detailJson: { not: null }
      }
    });
    
    console.log(`  With detailJson: ${micWithDetail.toLocaleString()}/${micTotal.toLocaleString()} (${(micWithDetail/micTotal*100).toFixed(1)}%)`);
    
    console.log('\n✅ Status check complete!\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
