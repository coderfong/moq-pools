const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const R2_PUBLIC_URL = 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev';

// Function to generate cache filename from URL (same logic as scraper)
function getCacheFilename(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const ext = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
  return `${hash}.${ext}`;
}

async function fixAlibabaDirectUrls() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding Alibaba listings with direct URLs...\n');
    
    // Get Alibaba listings using direct URLs
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: { contains: 'alibaba.com' } },
          { image: { contains: 'alicdn.com' } }
        ]
      },
      select: { id: true, image: true, title: true }
    });
    
    console.log(`   Found ${listings.length} listings with Alibaba direct URLs`);
    
    // Check which ones have cached versions
    const updates = [];
    let foundInCache = 0;
    let notInCache = 0;
    
    for (const listing of listings) {
      if (!listing.image) continue;
      
      // Try to find cached version
      const cacheFilename = getCacheFilename(listing.image);
      const cachePath = path.join(__dirname, 'public', 'cache', cacheFilename);
      
      if (fs.existsSync(cachePath)) {
        foundInCache++;
        updates.push({
          id: listing.id,
          oldImage: listing.image,
          newImage: `${R2_PUBLIC_URL}/cache/${cacheFilename}`,
          title: listing.title
        });
      } else {
        notInCache++;
      }
    }
    
    console.log(`   ✅ Found in cache: ${foundInCache}`);
    console.log(`   ❌ Not in cache: ${notInCache}`);
    
    if (updates.length === 0) {
      console.log('\n⚠️  No cached versions found for Alibaba direct URLs');
      console.log('   These URLs will continue to load directly from Alibaba');
      return;
    }
    
    console.log(`\n📝 Updating ${updates.length} listings to use R2 cached versions...`);
    
    // Update in batches
    const batchSize = 500;
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
    
    console.log(`\n✨ Done! Replaced ${updated} Alibaba direct URLs with R2 URLs`);
    
    // Show samples
    console.log('\n📸 Sample replacements:');
    updates.slice(0, 3).forEach(({ title, oldImage, newImage }) => {
      console.log(`\n   ${title.substring(0, 60)}...`);
      console.log(`   Before: ${oldImage.substring(0, 80)}...`);
      console.log(`   After:  ${newImage}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAlibabaDirectUrls();
