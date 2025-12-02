const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function checkSuccessfulFixes() {
  const prisma = new PrismaClient();
  
  try {
    // Get recently added R2 images (not the known bad ones)
    const badHashes = [
      '4e70cc58277297de2d4741c437c9dc425c4f8adb',
      'e7cc244e1d0f558ae9669f57b973758bc14103ee',
      'cd5cf41e57f830841012f9673a557f4174a58a78',
    ];
    
    const goodListings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL },
        NOT: {
          OR: badHashes.map(hash => ({ image: { contains: hash } }))
        }
      },
      select: { id: true, title: true, image: true, detailJson: true },
      take: 10,
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`\n✅ Found ${goodListings.length} listings with good R2 images\n`);
    
    goodListings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   Image: ${listing.image}`);
      
      if (listing.detailJson && listing.detailJson.gallery) {
        console.log(`   Gallery length: ${listing.detailJson.gallery.length}`);
        const first = listing.detailJson.gallery[0];
        const url = typeof first === 'string' ? first : first?.url || first?.src;
        if (url) {
          console.log(`   First gallery: ${url.substring(0, 80)}...`);
        }
      }
      console.log('');
    });
    
    // Stats
    const total = await prisma.savedListing.count({ where: { platform: 'ALIBABA' } });
    const withR2 = await prisma.savedListing.count({
      where: { platform: 'ALIBABA', image: { startsWith: R2_PUBLIC_URL } }
    });
    const withBadR2 = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: badHashes.map(hash => ({ image: { contains: hash } }))
      }
    });
    
    console.log(`\n📊 Stats:`);
    console.log(`   Total Alibaba listings: ${total}`);
    console.log(`   With R2 images: ${withR2} (${(withR2/total*100).toFixed(1)}%)`);
    console.log(`   With bad R2 images: ${withBadR2}`);
    console.log(`   With good R2 images: ${withR2 - withBadR2} (${((withR2 - withBadR2)/total*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuccessfulFixes();
