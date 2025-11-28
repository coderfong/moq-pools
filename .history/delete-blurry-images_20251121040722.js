const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('./prisma/generated/client4');
const sharp = require('sharp');

const prisma = new PrismaClient();

// Configuration
const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;
const MIN_FILE_SIZE = 5000;

async function analyzeImageQuality(imagePath) {
  try {
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    const issues = [];
    
    if (metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
      issues.push(`Small dimensions: ${metadata.width}x${metadata.height}`);
    }
    
    if (stats.size < MIN_FILE_SIZE) {
      issues.push(`Small file size: ${Math.round(stats.size / 1024)}KB`);
    }
    
    const expectedMinSize = (metadata.width * metadata.height) / 50;
    if (stats.size < expectedMinSize) {
      issues.push('Low quality/compressed');
    }
    
    return {
      isBlurry: issues.length > 0,
      issues
    };
  } catch (error) {
    return { isBlurry: true, issues: [`Error: ${error.message}`] };
  }
}

async function deleteBlurryImages(platform = null) {
  try {
    console.log('🗑️  Deleting blurry images...\n');
    
    const whereClause = {
      image: { startsWith: '/cache/' },
      isActive: true
    };
    
    if (platform) {
      whereClause.platform = platform.toUpperCase();
      console.log(`Filtering to platform: ${platform}\n`);
    }
    
    const listings = await prisma.savedListing.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        image: true,
        platform: true
      }
    });
    
    console.log(`Checking ${listings.length} listings...\n`);
    
    const cacheDir = path.join(process.cwd(), 'public', 'cache');
    let deleted = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (const listing of listings) {
      if (!listing.image) continue;
      
      const filename = path.basename(listing.image);
      const filepath = path.join(cacheDir, filename);
      
      try {
        // Check if file exists and is blurry
        const analysis = await analyzeImageQuality(filepath);
        
        if (analysis.isBlurry) {
          await fs.unlink(filepath);
          console.log(`✅ Deleted: ${filename} - ${listing.platform}`);
          console.log(`   Issues: ${analysis.issues.join(', ')}`);
          deleted++;
        } else {
          skipped++;
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          notFound++;
        } else {
          console.log(`❌ Error processing ${filename}: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Deleted: ${deleted}`);
    console.log(`Skipped (good quality): ${skipped}`);
    console.log(`Not found: ${notFound}`);
    console.log('\n✨ Done! Blurry images will be re-cached at higher quality on next load.\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args[0] || null;

// Check if sharp is installed
try {
  require.resolve('sharp');
  deleteBlurryImages(platform);
} catch (e) {
  console.error('⚠️  Sharp is not installed!');
  console.error('Please install it: pnpm add -D sharp');
  process.exit(1);
}
