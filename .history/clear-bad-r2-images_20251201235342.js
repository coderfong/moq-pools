const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Known bad image hashes
const BAD_HASHES = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb.png', // 600x600 placeholder
  'e7cc244e1d0f558ae9669f57b973758bc14103ee.png', // 920x110 banner
  'cd5cf41e57f830841012f9673a557f4174a58a78.png', // 297x40 banner
];

function isBadR2Image(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith(R2_PUBLIC_URL)) return false;
  
  return BAD_HASHES.some(hash => imageUrl.includes(hash));
}

async function clearBadR2Images() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding Alibaba listings with bad R2 images...\n');
    
    // Find all Alibaba listings with R2 images
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL }
      },
      select: { id: true, title: true, image: true }
    });
    
    console.log(`   Checking ${listings.length} R2 images...\n`);
    
    // Filter to only bad ones
    const badListings = listings.filter(l => isBadR2Image(l.image));
    
    console.log(`   Found ${badListings.length} listings with bad R2 images\n`);
    
    if (badListings.length === 0) {
      console.log('✅ No bad images found!');
      return;
    }
    
    // Show breakdown by hash
    const breakdown = {};
    badListings.forEach(l => {
      const hash = BAD_HASHES.find(h => l.image.includes(h));
      breakdown[hash] = (breakdown[hash] || 0) + 1;
    });
    
    console.log('📊 Breakdown by bad hash:');
    Object.entries(breakdown).forEach(([hash, count]) => {
      console.log(`   ${hash}: ${count} listings`);
    });
    console.log('');
    
    // Clear the image field for these listings
    console.log('🗑️  Clearing bad image URLs from database...\n');
    
    const result = await prisma.savedListing.updateMany({
      where: {
        id: { in: badListings.map(l => l.id) }
      },
      data: {
        image: null
      }
    });
    
    console.log(`✅ Cleared ${result.count} bad image URLs\n`);
    console.log('📝 These listings now have image=null and are ready for re-processing\n');
    console.log('🔧 Run: node fix-alibaba-images-from-detailjson.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearBadR2Images();
