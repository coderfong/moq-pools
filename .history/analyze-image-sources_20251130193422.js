const { PrismaClient } = require('./prisma/generated/client4');

const R2_PUBLIC_URL = 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev';

async function analyzeImageSources() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Analyzing Alibaba image sources...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      select: { id: true, image: true, title: true }
    });
    
    const sources = {
      r2: [],
      alibaba: [],
      cache: [],
      other: [],
      missing: []
    };
    
    for (const listing of listings) {
      if (!listing.image) {
        sources.missing.push(listing);
      } else if (listing.image.startsWith(R2_PUBLIC_URL)) {
        sources.r2.push(listing);
      } else if (listing.image.includes('alibaba.com') || listing.image.includes('alicdn.com')) {
        sources.alibaba.push(listing);
      } else if (listing.image.startsWith('/cache/')) {
        sources.cache.push(listing);
      } else {
        sources.other.push(listing);
      }
    }
    
    console.log('📊 Image Source Breakdown:');
    console.log(`   ✅ R2 CDN: ${sources.r2.length}`);
    console.log(`   🌐 Alibaba Direct: ${sources.alibaba.length}`);
    console.log(`   📁 Local /cache/: ${sources.cache.length}`);
    console.log(`   ❓ Other: ${sources.other.length}`);
    console.log(`   ❌ Missing: ${sources.missing.length}`);
    console.log(`   📈 Total: ${listings.length}`);
    
    // Show samples of non-R2 images
    if (sources.alibaba.length > 0) {
      console.log('\n🌐 Sample Alibaba Direct URLs:');
      sources.alibaba.slice(0, 5).forEach(x => {
        console.log(`\n   ${x.title.substring(0, 60)}...`);
        console.log(`   ${x.image.substring(0, 100)}...`);
      });
    }
    
    if (sources.cache.length > 0) {
      console.log('\n📁 Sample Local Cache Paths (BROKEN):');
      sources.cache.slice(0, 5).forEach(x => {
        console.log(`\n   ${x.title.substring(0, 60)}...`);
        console.log(`   ${x.image}`);
      });
    }
    
    if (sources.other.length > 0) {
      console.log('\n❓ Sample Other URLs:');
      sources.other.slice(0, 5).forEach(x => {
        console.log(`\n   ${x.title.substring(0, 60)}...`);
        console.log(`   ${x.image.substring(0, 100)}...`);
      });
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

analyzeImageSources();
