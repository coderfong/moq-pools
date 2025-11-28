const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function analyzeScrapeTiming() {
  try {
    console.log('Analyzing Alibaba scrape timing...\n');
    
    // Get listings with good data
    const good = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        detailJson: { not: null }
      },
      select: {
        id: true,
        title: true,
        detailUpdatedAt: true,
        detailJson: true
      },
      orderBy: { detailUpdatedAt: 'desc' },
      take: 20
    });
    
    console.log('RECENTLY SCRAPED LISTINGS WITH GOOD DATA:');
    console.log('='.repeat(80));
    
    good.forEach((listing, i) => {
      const detail = listing.detailJson;
      const hasGoodData = detail.attributes && detail.attributes.length > 3;
      
      console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   Scraped: ${listing.detailUpdatedAt || 'Unknown'}`);
      console.log(`   Attributes: ${detail.attributes?.length || 0}`);
      console.log(`   Price Tiers: ${detail.priceTiers?.length || 0}`);
      console.log(`   Quality: ${hasGoodData ? '✅ GOOD' : '⚠️  WEAK'}`);
      console.log('');
    });
    
    // Get the earliest and latest scrape times
    const earliest = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        detailUpdatedAt: { not: null }
      },
      orderBy: { detailUpdatedAt: 'asc' },
      select: { detailUpdatedAt: true }
    });
    
    const latest = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        detailUpdatedAt: { not: null }
      },
      orderBy: { detailUpdatedAt: 'desc' },
      select: { detailUpdatedAt: true }
    });
    
    console.log('='.repeat(80));
    console.log('TIMELINE:');
    console.log(`Earliest scrape: ${earliest?.detailUpdatedAt || 'Unknown'}`);
    console.log(`Latest scrape: ${latest?.detailUpdatedAt || 'Unknown'}`);
    
    // Check if there's a pattern - were old scrapes better?
    const oldGood = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        detailUpdatedAt: {
          lt: new Date('2025-11-10')
        },
        detailJson: {
          path: ['attributes'],
          array_contains: [{}] // Has at least one attribute
        }
      }
    });
    
    const newGood = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        detailUpdatedAt: {
          gte: new Date('2025-11-10')
        },
        detailJson: {
          path: ['attributes'],
          array_contains: [{}]
        }
      }
    });
    
    console.log(`\nOlder scrapes (before Nov 10) with good data: ${oldGood}`);
    console.log(`Newer scrapes (after Nov 10) with good data: ${newGood}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeScrapeTiming();
