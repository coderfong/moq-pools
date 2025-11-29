/**
 * Update database to use existing cached images
 * Changes /cache/abc123.jpg paths to point to actual cache files
 */

const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking cached images...\n');
  
  // Get cache directory
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  
  try {
    const files = await fs.readdir(cacheDir);
    const imageFiles = new Set(files.filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
    ));
    
    console.log(`✅ Found ${imageFiles.size} cached image files\n`);
    
    // Get listings with /cache/ paths
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: {
          startsWith: '/cache/'
        }
      },
      select: {
        id: true,
        title: true,
        image: true,
      }
    });
    
    console.log(`📊 Found ${listings.length} listings with /cache/ paths\n`);
    
    let matched = 0;
    let missing = 0;
    
    console.log('🔄 Verifying cache files exist...\n');
    
    for (const listing of listings) {
      // Extract filename from path like /cache/abc123.jpg
      const filename = listing.image.split('/cache/')[1];
      
      if (imageFiles.has(filename)) {
        matched++;
      } else {
        missing++;
        if (missing <= 5) {
          console.log(`❌ Missing: ${filename} for "${listing.title.substring(0, 50)}..."`);
        }
      }
    }
    
    console.log(`\n📈 Results:`);
    console.log(`   ✅ Matched: ${matched} (${((matched/listings.length)*100).toFixed(1)}%)`);
    console.log(`   ❌ Missing: ${missing} (${((missing/listings.length)*100).toFixed(1)}%)`);
    
    if (matched > 0) {
      console.log(`\n✨ Good news! The /cache/ paths already point to existing files.`);
      console.log(`\n📦 To deploy:`);
      console.log(`   1. Upload the public/cache folder to your deployment`);
      console.log(`   2. Ensure static files are served from public/cache`);
      console.log(`   3. The paths like /cache/abc123.jpg will work automatically\n`);
    }
    
    if (missing > 0) {
      console.log(`\n⚠️  ${missing} listings have missing cache files.`);
      console.log(`   You'll need to either:`);
      console.log(`   - Re-scrape those specific listings`);
      console.log(`   - Use a placeholder image`);
      console.log(`   - Mark them as unavailable\n`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
