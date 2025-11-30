const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs');
const path = require('path');

const R2_PUBLIC_URL = 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev';

async function restoreR2Urls() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Checking Alibaba listings...\n');
    
    // Get all Alibaba listings
    const listings = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      select: { id: true, image: true }
    });
    
    console.log(`   Found ${listings.length} Alibaba listings`);
    
    // Check which ones need R2 URLs
    let needsUpdate = 0;
    let alreadyR2 = 0;
    const updates = [];
    
    for (const listing of listings) {
      if (!listing.image) continue;
      
      // Already using R2
      if (listing.image.startsWith(R2_PUBLIC_URL)) {
        alreadyR2++;
        continue;
      }
      
      // Check if it's a /cache/ path
      if (listing.image.startsWith('/cache/')) {
        const filename = listing.image.replace('/cache/', '');
        const localPath = path.join(__dirname, 'public', 'cache', filename);
        
        // Check if file exists in our cache
        if (fs.existsSync(localPath)) {
          updates.push({
            id: listing.id,
            oldImage: listing.image,
            newImage: `${R2_PUBLIC_URL}/cache/${filename}`
          });
          needsUpdate++;
        }
      }
    }
    
    console.log(`   ✅ Already using R2: ${alreadyR2}`);
    console.log(`   🔄 Need R2 update: ${needsUpdate}`);
    
    if (updates.length === 0) {
      console.log('\n✨ All Alibaba listings already have R2 URLs!');
      return;
    }
    
    console.log(`\n📝 Updating ${updates.length} listings with R2 URLs...`);
    
    // Update in batches
    const batchSize = 1000;
    let updated = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      await Promise.all(batch.map(({ id, newImage }) =>
        prisma.savedListing.update({
          where: { id },
          data: { image: newImage }
        })
      ));
      
      updated += batch.length;
      console.log(`   ✅ Updated ${updated}/${updates.length}`);
    }
    
    console.log(`\n✨ Done! Updated ${updated} listings to use R2 URLs`);
    
    // Show samples
    console.log('\n📸 Sample updated URLs:');
    updates.slice(0, 5).forEach(({ oldImage, newImage }) => {
      console.log(`\n   Before: ${oldImage}`);
      console.log(`   After:  ${newImage}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreR2Urls();
