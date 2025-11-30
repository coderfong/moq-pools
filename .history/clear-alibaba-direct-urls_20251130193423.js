const { PrismaClient } = require('./prisma/generated/client4');

async function clearAllAlibabaDirectUrls() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding all Alibaba listings with direct URLs...\n');
    
    // Count first
    const count = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: { contains: 'alibaba.com' } },
          { image: { contains: 'alicdn.com' } }
        ]
      }
    });
    
    console.log(`   Found ${count} listings with Alibaba direct URLs`);
    console.log('   These are all bad placeholder/icon images\n');
    
    if (count === 0) {
      console.log('✨ No Alibaba direct URLs found!');
      return;
    }
    
    console.log('🗑️  Clearing bad Alibaba direct URLs...\n');
    
    // Clear them (set to null so they can be re-scraped later)
    const result = await prisma.savedListing.updateMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: { contains: 'alibaba.com' } },
          { image: { contains: 'alicdn.com' } }
        ]
      },
      data: {
        image: null
      }
    });
    
    console.log(`   ✅ Cleared ${result.count} bad image URLs`);
    console.log('\n📊 Final status:');
    
    // Get new counts
    const total = await prisma.savedListing.count({ where: { platform: 'ALIBABA' } });
    const withR2 = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev' }
      }
    });
    const withCache = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: '/cache/' }
      }
    });
    const missing = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    console.log(`   Total Alibaba: ${total}`);
    console.log(`   ✅ R2 CDN: ${withR2}`);
    console.log(`   📁 Local /cache/: ${withCache}`);
    console.log(`   ❌ Missing: ${missing}`);
    console.log(`   Coverage: ${((withR2 + withCache) / total * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllAlibabaDirectUrls();
