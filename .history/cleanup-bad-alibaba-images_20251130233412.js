const { PrismaClient } = require('./prisma/generated/client4');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Check if image is likely a banner/logo/blocker
async function checkImageDimensions(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => resolve({ isValid: false, reason: 'timeout' }), 10000);

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      clearTimeout(timeout);
      
      if (res.statusCode !== 200) {
        return resolve({ isValid: false, reason: `status ${res.statusCode}` });
      }

      const chunks = [];
      let size = 0;
      
      res.on('data', chunk => {
        chunks.push(chunk);
        size += chunk.length;
        
        // Stop after getting enough data to check dimensions
        if (size > 50000) {
          res.destroy();
        }
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // Quick dimension check from image headers
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          for (let i = 2; i < buffer.length - 8; i++) {
            if (buffer[i] === 0xFF && buffer[i+1] === 0xC0) {
              const height = buffer.readUInt16BE(i + 5);
              const width = buffer.readUInt16BE(i + 7);
              
              // Check for banner-like dimensions
              const aspectRatio = width / height;
              const isBanner = aspectRatio > 3 || aspectRatio < 0.33; // Very wide or tall
              const isTooSmall = width < 200 || height < 200; // Likely logo/icon
              const isTooLarge = width > 3000 || height > 3000; // Likely banner
              
              return resolve({
                isValid: !isBanner && !isTooSmall && !isTooLarge,
                reason: isBanner ? `banner aspect ${aspectRatio.toFixed(2)}` : 
                       isTooSmall ? `too small ${width}x${height}` :
                       isTooLarge ? `too large ${width}x${height}` : 'ok',
                width,
                height
              });
            }
          }
        }
        
        // PNG
        if (buffer.toString('ascii', 1, 4) === 'PNG') {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          
          const aspectRatio = width / height;
          const isBanner = aspectRatio > 3 || aspectRatio < 0.33;
          const isTooSmall = width < 200 || height < 200;
          const isTooLarge = width > 3000 || height > 3000;
          
          return resolve({
            isValid: !isBanner && !isTooSmall && !isTooLarge,
            reason: isBanner ? `banner aspect ${aspectRatio.toFixed(2)}` : 
                   isTooSmall ? `too small ${width}x${height}` :
                   isTooLarge ? `too large ${width}x${height}` : 'ok',
            width,
            height
          });
        }
        
        resolve({ isValid: true, reason: 'unknown format but keeping' });
      });

      res.on('error', () => {
        clearTimeout(timeout);
        resolve({ isValid: false, reason: 'download error' });
      });
    }).on('error', () => {
      clearTimeout(timeout);
      resolve({ isValid: false, reason: 'connection error' });
    });
  });
}

async function cleanupBadImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding Alibaba listings with R2 images...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL },
        detailJson: { not: null }
      },
      select: { id: true, title: true, image: true, detailJson: true }
    });
    
    console.log(`   Found ${listings.length} listings to check\n`);
    
    let checked = 0;
    let badImages = 0;
    let goodImages = 0;
    let errors = 0;
    
    const badListings = [];
    
    for (const listing of listings) {
      try {
        const imageCheck = await checkImageDimensions(listing.image);
        
        if (!imageCheck.isValid) {
          badImages++;
          badListings.push({ 
            id: listing.id, 
            title: listing.title,
            image: listing.image,
            reason: imageCheck.reason,
            detailJson: listing.detailJson
          });
          
          console.log(`   ❌ BAD: ${listing.title.substring(0, 50)}... - ${imageCheck.reason}`);
        } else {
          goodImages++;
          if (imageCheck.width && imageCheck.height) {
            console.log(`   ✅ GOOD: ${listing.title.substring(0, 50)}... (${imageCheck.width}x${imageCheck.height})`);
          }
        }
        
        checked++;
        
        if (checked % 50 === 0) {
          console.log(`\n   Progress: ${checked}/${listings.length} - Bad: ${badImages}, Good: ${goodImages}\n`);
        }
        
      } catch (error) {
        errors++;
        console.log(`   ⚠️  ERROR: ${listing.title.substring(0, 40)}... - ${error.message}`);
      }
    }
    
    console.log(`\n\n📊 Results:`);
    console.log(`   Checked: ${checked}`);
    console.log(`   Good Images: ${goodImages}`);
    console.log(`   Bad Images: ${badImages}`);
    console.log(`   Errors: ${errors}`);
    
    if (badListings.length > 0) {
      console.log(`\n\n🗑️  Found ${badListings.length} bad images to remove`);
      console.log(`\n   Do you want to:`);
      console.log(`   1. Clear bad images from DB (set image to null)`);
      console.log(`   2. Delete from R2 and clear from DB`);
      console.log(`   3. Just show the list and exit\n`);
      
      // Save bad listings to file for review
      const fs = require('fs');
      fs.writeFileSync(
        'bad-alibaba-images.json',
        JSON.stringify(badListings.map(l => ({
          id: l.id,
          title: l.title,
          image: l.image,
          reason: l.reason
        })), null, 2)
      );
      
      console.log(`   📝 Saved bad listings to bad-alibaba-images.json`);
      console.log(`\n   Run with --clear to clear from DB or --delete to delete from R2\n`);
      
      // If --clear flag
      if (process.argv.includes('--clear')) {
        console.log(`\n🧹 Clearing bad images from database...`);
        
        for (const listing of badListings) {
          await prisma.savedListing.update({
            where: { id: listing.id },
            data: { image: null }
          });
        }
        
        console.log(`   ✅ Cleared ${badListings.length} images from database`);
      }
      
      // If --delete flag
      if (process.argv.includes('--delete')) {
        console.log(`\n🗑️  Deleting bad images from R2 and database...`);
        
        for (const listing of badListings) {
          try {
            // Extract filename from URL
            const filename = listing.image.split('/cache/')[1];
            
            // Delete from R2
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: `cache/${filename}`
            }));
            
            // Clear from database
            await prisma.savedListing.update({
              where: { id: listing.id },
              data: { image: null }
            });
            
            console.log(`   🗑️  Deleted: ${listing.title.substring(0, 40)}...`);
          } catch (error) {
            console.log(`   ❌ Failed to delete: ${listing.title.substring(0, 40)}... - ${error.message}`);
          }
        }
        
        console.log(`   ✅ Cleanup complete!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupBadImages();
