const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs');
const path = require('path');

const R2_PUBLIC_URL = 'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev';

// Enhanced bad image detection (from detail.ts)
function isAlibabaBadImageUrl(url) {
  try {
    const x = url.toLowerCase();
    // Bad patterns
    if (/@img|sprite|logo|favicon|badge|watermark/.test(x)) return true;
    if (/tps-\d+-\d+\.png$/.test(x)) return true;
    if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(x) && !/_\d{2,4}x\d{2,4}/.test(x)) return true;
    
    // All tps-sized images are usually placeholders
    if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(x)) return true;
    if (x.includes('imgextra') && /[0-9]{4,6}-[0-9]-tps-[0-9]+-[0-9]+/i.test(x)) return true;
    if (x.match(/\d{4,6}-\d-tps-\d{2,4}-\d{2,4}\.(png|jpe?g)/i)) return true;
    
    // Small image sizes (usually icons/badges)
    if (/_80x80\.(jpg|png|jpeg)$/i.test(x)) return true;
    if (/_50x50\.(jpg|png|jpeg)$/i.test(x)) return true;
    
    return false;
  } catch {
    return false;
  }
}

async function revertBadAlibabaUrls() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding Alibaba listings with bad direct URLs...\n');
    
    // Get all Alibaba listings with direct URLs
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
    
    // Filter to only bad images
    const badImages = listings.filter(l => l.image && isAlibabaBadImageUrl(l.image));
    console.log(`   ❌ Bad images (placeholders/badges): ${badImages.length}`);
    
    // For bad images, we need to find alternative images from cache
    // Look for any cached image files for these listings
    const cacheDir = path.join(__dirname, 'public', 'cache');
    const cacheFiles = fs.readdirSync(cacheDir);
    const cacheFileSet = new Set(cacheFiles);
    
    console.log(`   📁 Found ${cacheFiles.length} files in local cache\n`);
    
    // We can't directly map bad URLs to cache files, so we'll need to:
    // 1. Delete the bad image URLs (set to null)
    // 2. Let the scraper re-fetch good images later
    
    console.log('🗑️  Clearing bad image URLs...\n');
    
    let cleared = 0;
    const batchSize = 500;
    
    for (let i = 0; i < badImages.length; i += batchSize) {
      const batch = badImages.slice(i, i + batchSize);
      
      await Promise.all(batch.map(({ id }) =>
        prisma.savedListing.update({
          where: { id },
          data: { image: null }
        })
      ));
      
      cleared += batch.length;
      console.log(`   ✅ Cleared ${cleared}/${badImages.length}`);
    }
    
    console.log(`\n✨ Done! Cleared ${cleared} bad image URLs`);
    console.log('\n📋 Summary:');
    console.log(`   - These listings now have no image and need re-scraping`);
    console.log(`   - Run a scraper to fetch proper product images for them`);
    
    // Show samples
    if (badImages.length > 0) {
      console.log('\n🗑️  Sample bad URLs that were cleared:');
      badImages.slice(0, 5).forEach(({ title, image }) => {
        console.log(`\n   ${title.substring(0, 60)}...`);
        console.log(`   ${image.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertBadAlibabaUrls();
