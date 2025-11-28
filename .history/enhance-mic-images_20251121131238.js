#!/usr/bin/env node
/**
 * Enhance blurry Made-in-China images by upscaling and sharpening
 * Targets 100x100px images that need quality improvement
 */

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { PrismaClient } = require('./prisma/generated/client4');

const prisma = new PrismaClient();

const MIN_SIZE = 300; // Target minimum size
const TARGET_SIZE = 400; // Upscale to this size for better quality

async function enhanceSmallImage(inputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`    Original: ${metadata.width}x${metadata.height} (${metadata.format})`);
    
    // If image is small, upscale and sharpen
    if (metadata.width < MIN_SIZE || metadata.height < MIN_SIZE) {
      const maxDim = Math.max(metadata.width, metadata.height);
      const scale = TARGET_SIZE / maxDim;
      
      // Create backup
      const backupPath = inputPath + '.backup';
      await fs.copyFile(inputPath, backupPath);
      
      // Upscale with Lanczos3 (best quality) and sharpen
      await image
        .resize({
          width: Math.round(metadata.width * scale),
          height: Math.round(metadata.height * scale),
          kernel: 'lanczos3', // Best quality scaling
          fit: 'inside'
        })
        .sharpen({
          sigma: 1.5,  // Sharpening amount
          m1: 1.0,     // Flat areas
          m2: 2.0      // Jagged areas  
        })
        .jpeg({
          quality: 90,
          chromaSubsampling: '4:4:4', // Best color quality
          mozjpeg: true // Better compression
        })
        .toFile(inputPath + '.enhanced');
      
      // Replace original with enhanced
      await fs.unlink(inputPath);
      await fs.rename(inputPath + '.enhanced', inputPath);
      
      const newMetadata = await sharp(inputPath).metadata();
      console.log(`    ✅ Enhanced: ${newMetadata.width}x${newMetadata.height}`);
      
      return true;
    } else {
      console.log(`    ⏭️  Already good size, skipping`);
      return false;
    }
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding Made-in-China images that need enhancement...\n');
  
  // Find MIC listings with cached images
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'MADE_IN_CHINA',
      image: {
        startsWith: '/cache/'
      }
    },
    select: {
      id: true,
      title: true,
      image: true
    },
    take: 500 // Process in batches
  });
  
  console.log(`Found ${listings.length} Made-in-China listings with cached images\n`);
  
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  let enhanced = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const progress = `[${i + 1}/${listings.length}]`;
    
    if (!listing.image) {
      skipped++;
      continue;
    }
    
    const filename = path.basename(listing.image);
    const filepath = path.join(cacheDir, filename);
    
    console.log(`\n${progress} ${listing.title.substring(0, 60)}...`);
    console.log(`  File: ${filename}`);
    
    try {
      // Check if file exists
      await fs.access(filepath);
      
      // Check current dimensions
      const metadata = await sharp(filepath).metadata();
      
      if (metadata.width < MIN_SIZE || metadata.height < MIN_SIZE) {
        const result = await enhanceSmallImage(filepath);
        if (result) enhanced++;
        else skipped++;
      } else {
        console.log(`    Already good: ${metadata.width}x${metadata.height}`);
        skipped++;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`    ⚠️  File not found`);
      } else {
        console.error(`    ❌ Error: ${error.message}`);
      }
      errors++;
    }
    
    // Progress update every 50 images
    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${listings.length} processed`);
      console.log(`   Enhanced: ${enhanced}, Skipped: ${skipped}, Errors: ${errors}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total processed: ${listings.length}`);
  console.log(`Enhanced: ${enhanced}`);
  console.log(`Skipped (already good): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('\n✨ Done! Small images have been upscaled and sharpened.');
  console.log('Backups saved with .backup extension (can be deleted if satisfied)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
