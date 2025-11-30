const { PrismaClient } = require('./prisma/generated/client4');

async function verifyR2() {
  const prisma = new PrismaClient();
  
  try {
    // Count total Alibaba listings with R2 URLs
    const r2Count = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev' }
      }
    });
    
    // Count total Alibaba listings
    const totalCount = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    console.log('\n📊 Database Verification:');
    console.log(`   Total Alibaba listings: ${totalCount}`);
    console.log(`   With R2 URLs: ${r2Count}`);
    console.log(`   Coverage: ${((r2Count/totalCount)*100).toFixed(1)}%`);
    
    // Get 5 sample listings
    const samples = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev' }
      },
      take: 5,
      select: { id: true, title: true, image: true }
    });
    
    console.log('\n✅ Sample R2 URLs:');
    samples.forEach(x => {
      console.log(`\n- ${x.title.substring(0,60)}...`);
      console.log(`  ${x.image}`);
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

verifyR2();
