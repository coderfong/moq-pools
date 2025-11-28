const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('./prisma/generated/client4');
const sharp = require('sharp');

const prisma = new PrismaClient();

// Configuration
const MIN_WIDTH = 200;  // Minimum acceptable width
const MIN_HEIGHT = 200; // Minimum acceptable height
const MIN_FILE_SIZE = 5000; // Minimum file size in bytes (5KB)

async function analyzeImageQuality(imagePath) {
  try {
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    const issues = [];
    
    // Check dimensions
    if (metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
      issues.push(`Small dimensions: ${metadata.width}x${metadata.height}`);
    }
    
    // Check file size
    if (stats.size < MIN_FILE_SIZE) {
      issues.push(`Small file size: ${Math.round(stats.size / 1024)}KB`);
    }
    
    // Check if image is suspiciously small for its dimensions
    const expectedMinSize = (metadata.width * metadata.height) / 50; // Very rough estimate
    if (stats.size < expectedMinSize) {
      issues.push('Potentially low quality/compressed');
    }
    
    return {
      width: metadata.width,
      height: metadata.height,
      size: stats.size,
      format: metadata.format,
      issues: issues,
      isBlurry: issues.length > 0
    };
  } catch (error) {
    return {
      issues: [`Cannot read image: ${error.message}`],
      isBlurry: true
    };
  }
}

async function findAndFixBlurryImages() {
  try {
    console.log('🔍 Scanning for blurry/low-quality images...\n');
    
    // Get all listings with cached images
    const listings = await prisma.savedListing.findMany({
      where: {
        image: {
          startsWith: '/cache/'
        },
        isActive: true
      },
      select: {
        id: true,
        title: true,
        image: true,
        platform: true,
        url: true
      },
      take: 1000 // Process in batches
    });
    
    console.log(`Found ${listings.length} listings with cached images\n`);
    
    const cacheDir = path.join(process.cwd(), 'public', 'cache');
    const blurryImages = [];
    let checked = 0;
    
    for (const listing of listings) {
      if (!listing.image) continue;
      
      const filename = path.basename(listing.image);
      const filepath = path.join(cacheDir, filename);
      
      try {
        const analysis = await analyzeImageQuality(filepath);
        checked++;
        
        if (analysis.isBlurry) {
          blurryImages.push({
            listing,
            filepath,
            filename,
            analysis
          });
          
          console.log(`❌ BLURRY: ${listing.title.substring(0, 60)}...`);
          console.log(`   Platform: ${listing.platform}`);
          console.log(`   Image: ${filename}`);
          if (analysis.width && analysis.height) {
            console.log(`   Size: ${analysis.width}x${analysis.height} (${Math.round(analysis.size / 1024)}KB)`);
          }
          console.log(`   Issues: ${analysis.issues.join(', ')}`);
          console.log('');
        }
        
        // Progress indicator
        if (checked % 50 === 0) {
          console.log(`Progress: ${checked}/${listings.length} checked...`);
        }
      } catch (error) {
        // Skip files that don't exist
        if (error.code !== 'ENOENT') {
          console.log(`⚠️  Error checking ${filename}: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total checked: ${checked}`);
    console.log(`Blurry/low-quality: ${blurryImages.length}`);
    
    if (blurryImages.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('PLATFORMS BREAKDOWN');
      console.log('='.repeat(80));
      
      const platformCounts = {};
      blurryImages.forEach(item => {
        platformCounts[item.listing.platform] = (platformCounts[item.listing.platform] || 0) + 1;
      });
      
      Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([platform, count]) => {
          console.log(`${platform}: ${count}`);
        });
      
      console.log('\n' + '='.repeat(80));
      console.log('OPTIONS');
      console.log('='.repeat(80));
      console.log('1. Delete all blurry images (they will be re-cached on next load)');
      console.log('2. Delete only specific platform images');
      console.log('3. Export list to CSV');
      console.log('\nTo delete, run: node delete-blurry-images.js');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if sharp is installed
try {
  require.resolve('sharp');
  findAndFixBlurryImages();
} catch (e) {
  console.error('⚠️  Sharp is not installed!');
  console.error('Please install it: pnpm add -D sharp');
  process.exit(1);
}
