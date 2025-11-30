const { PrismaClient } = require('./prisma/generated/client4');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
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

function getCacheFilename(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const ext = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
  return `${hash}.${ext}`;
}

function isAlibabaBadImageUrl(url) {
  try {
    const x = url.toLowerCase();
    if (/@img|sprite|logo|favicon|badge|watermark/.test(x)) return true;
    if (/tps-\d+-\d+\.png$/.test(x)) return true;
    if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(x) && !/_\d{2,4}x\d{2,4}/.test(x)) return true;
    if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(x)) return true;
    if (x.includes('imgextra') && /[0-9]{4,6}-[0-9]-tps-[0-9]+-[0-9]+/i.test(x)) return true;
    if (x.match(/\d{4,6}-\d-tps-\d{2,4}-\d{2,4}\.(png|jpe?g)/i)) return true;
    if (/_80x80\.(jpg|png|jpeg)$/i.test(x)) return true;
    if (/_50x50\.(jpg|png|jpeg)$/i.test(x)) return true;
    return false;
  } catch {
    return false;
  }
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        return reject(new Error(`Status ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks));
      });
      res.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function uploadToR2(filename, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `cache/${filename}`,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
}

async function fixRemainingAlibabaImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Fetching remaining Alibaba direct URLs...\n');
    
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
    
    // Filter out bad images
    const goodImages = listings.filter(l => l.image && !isAlibabaBadImageUrl(l.image));
    const badImages = listings.filter(l => l.image && isAlibabaBadImageUrl(l.image));
    
    console.log(`   Total direct URLs: ${listings.length}`);
    console.log(`   ✅ Good images: ${goodImages.length}`);
    console.log(`   ❌ Bad images (will skip): ${badImages.length}\n`);
    
    // Clear bad images immediately
    if (badImages.length > 0) {
      console.log('🗑️  Clearing bad images...');
      for (let i = 0; i < badImages.length; i += 500) {
        const batch = badImages.slice(i, i + 500);
        await Promise.all(batch.map(({ id }) =>
          prisma.savedListing.update({
            where: { id },
            data: { image: null }
          })
        ));
        console.log(`   Cleared ${Math.min(i + 500, badImages.length)}/${badImages.length}`);
      }
      console.log();
    }
    
    let processed = 0;
    let uploaded = 0;
    let failed = 0;
    let alreadyCached = 0;
    
    const batchSize = 50;
    
    for (let i = 0; i < goodImages.length; i += batchSize) {
      const batch = goodImages.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, goodImages.length)}/${goodImages.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          const filename = getCacheFilename(listing.image);
          const localPath = path.join(__dirname, 'public', 'cache', filename);
          
          // Check if already exists in R2 (via database)
          const existing = await prisma.savedListing.findFirst({
            where: {
              image: `${R2_PUBLIC_URL}/cache/${filename}`
            }
          });
          
          if (existing || fs.existsSync(localPath)) {
            // Already processed, just update this listing
            await prisma.savedListing.update({
              where: { id: listing.id },
              data: { image: `${R2_PUBLIC_URL}/cache/${filename}` }
            });
            alreadyCached++;
            return;
          }
          
          // Download image
          const buffer = await downloadImage(listing.image);
          
          // Check if image is too small (likely a placeholder)
          if (buffer.length < 5000) {
            console.log(`   ⚠️  Skipping tiny image (${buffer.length} bytes): ${listing.title.substring(0, 40)}...`);
            await prisma.savedListing.update({
              where: { id: listing.id },
              data: { image: null }
            });
            failed++;
            return;
          }
          
          // Determine content type
          let contentType = 'image/jpeg';
          if (filename.endsWith('.png')) contentType = 'image/png';
          else if (filename.endsWith('.webp')) contentType = 'image/webp';
          else if (filename.endsWith('.gif')) contentType = 'image/gif';
          
          // Save locally
          fs.writeFileSync(localPath, buffer);
          
          // Upload to R2
          await uploadToR2(filename, buffer, contentType);
          
          // Update database
          await prisma.savedListing.update({
            where: { id: listing.id },
            data: { image: `${R2_PUBLIC_URL}/cache/${filename}` }
          });
          
          uploaded++;
          
        } catch (error) {
          failed++;
          if (!error.message.includes('404')) {
            console.log(`   ❌ ${listing.title.substring(0, 50)}... - ${error.message}`);
          }
        }
        
        processed++;
      }));
      
      console.log(`   ✅ Uploaded: ${uploaded}, Cached: ${alreadyCached}, Failed: ${failed}`);
    }
    
    console.log(`\n✨ Done!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Newly uploaded: ${uploaded}`);
    console.log(`   Already cached: ${alreadyCached}`);
    console.log(`   Failed: ${failed}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingAlibabaImages();
