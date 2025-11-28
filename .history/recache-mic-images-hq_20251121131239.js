#!/usr/bin/env node
/**
 * Re-cache Made-in-China images at higher quality
 * Replaces 100x100px thumbnails with 640x640px versions
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { PrismaClient } = require('./prisma/generated/client4');

const prisma = new PrismaClient();

async function downloadAndEnhance(url) {
  try {
    // Download image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.made-in-china.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    
    console.log(`    Downloaded: ${metadata.width}x${metadata.height} ${metadata.format} (${Math.round(buffer.length / 1024)}KB)`);
    
    // If image is small, try to get larger version
    if (metadata.width < 200 || metadata.height < 200) {
      console.log(`    ⚠️  Image too small, trying larger size...`);
      
      // Try to replace size suffix
      let largerUrl = url;
      if (url.includes('_100x100.')) {
        largerUrl = url.replace('_100x100.', '_640x640.');
      } else if (url.includes('_128x128.')) {
        largerUrl = url.replace('_128x128.', '_640x640.');
      } else if (!url.includes('_640x640.') && !url.includes('_800x800.')) {
        // Try adding 640x640 before extension
        largerUrl = url.replace(/\.(\w+)$/, '_640x640.$1');
      }
      
      if (largerUrl !== url) {
        console.log(`    Trying: ${largerUrl}`);
        try {
          const largerResponse = await fetch(largerUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.made-in-china.com/',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
          });
          
          if (largerResponse.ok) {
            const largerBuffer = Buffer.from(await largerResponse.arrayBuffer());
            const largerMeta = await sharp(largerBuffer).metadata();
            console.log(`    ✅ Got larger: ${largerMeta.width}x${largerMeta.height} (${Math.round(largerBuffer.length / 1024)}KB)`);
            return { buffer: largerBuffer, url: largerUrl };
          }
        } catch (e) {
          console.log(`    Failed to get larger version: ${e.message}`);
        }
      }
    }
    
    return { buffer, url };
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function cacheImage(buffer, originalUrl) {
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  await fs.mkdir(cacheDir, { recursive: true });
  
  // Create hash from URL
  const hash = crypto.createHash('sha1').update(originalUrl).digest('hex');
  
  // Process with Sharp - enhance quality
  const enhanced = await sharp(buffer)
    .resize({
      width: 400,
      height: 400,
      fit: 'inside',
      kernel: 'lanczos3',
      withoutEnlargement: false // Allow upscaling small images
    })
    .sharpen({
      sigma: 1.2,
      m1: 1.0,
      m2: 1.5
    })
    .jpeg({
      quality: 88,
      chromaSubsampling: '4:4:4',
      mozjpeg: true
    })
    .toBuffer();
  
  const cachePath = path.join(cacheDir, `${hash}.jpg`);
  await fs.writeFile(cachePath, enhanced);
  
  const metadata = await sharp(enhanced).metadata();
  console.log(`    💾 Cached: ${metadata.width}x${metadata.height} (${Math.round(enhanced.length / 1024)}KB)`);
  
  return `/cache/${hash}.jpg`;
}

async function main() {
  console.log('🔍 Finding Made-in-China listings with external images...\n');
  
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'MADE_IN_CHINA',
      image: {
        startsWith: 'https://image.made-in-china.com'
      }
    },
    select: {
      id: true,
      title: true,
      image: true
    },
    take: 100 // Process first 100
  });
  
  console.log(`Found ${listings.length} Made-in-China listings with external images\n`);
  
  let cached = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const progress = `[${i + 1}/${listings.length}]`;
    
    console.log(`\n${progress} ${listing.title.substring(0, 60)}...`);
    console.log(`  Current: ${listing.image}`);
    
    try {
      // Download and potentially get larger version
      const { buffer, url } = await downloadAndEnhance(listing.image);
      
      // Cache locally with enhancement
      const localPath = await cacheImage(buffer, url);
      
      // Update database
      await prisma.savedListing.update({
        where: { id: listing.id },
        data: { image: localPath }
      });
      
      console.log(`  ✅ Updated to: ${localPath}`);
      cached++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      errors++;
    }
    
    if ((i + 1) % 20 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${listings.length}`);
      console.log(`   Cached: ${cached}, Errors: ${errors}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total processed: ${listings.length}`);
  console.log(`Cached: ${cached}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('\n✨ Done! Images are now cached locally at higher quality.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
