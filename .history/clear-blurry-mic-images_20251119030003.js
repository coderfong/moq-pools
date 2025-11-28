const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function clearBlurryMICImages() {
  try {
    console.log('Finding Made-in-China listings with WebP images...\n');
    
    const micListings = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: {
          contains: '.webp'
        }
      },
      select: {
        id: true,
        title: true,
        image: true
      }
    });
    
    console.log(`Found ${micListings.length} Made-in-China listings with WebP images\n`);
    
    const cacheDir = path.join(process.cwd(), 'public', 'cache');
    let deleted = 0;
    let notFound = 0;
    
    for (const listing of micListings) {
      if (listing.image && listing.image.startsWith('/cache/')) {
        const filename = path.basename(listing.image);
        const filepath = path.join(cacheDir, filename);
        
        try {
          await fs.unlink(filepath);
          console.log(`✅ Deleted: ${filename}`);
          deleted++;
        } catch (error) {
          if (error.code === 'ENOENT') {
            notFound++;
          } else {
            console.log(`❌ Error deleting ${filename}: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Deleted: ${deleted}`);
    console.log(`Not found (already deleted): ${notFound}`);
    console.log('\n✨ Done! The images will be re-cached at higher quality on next page load.\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearBlurryMICImages();
