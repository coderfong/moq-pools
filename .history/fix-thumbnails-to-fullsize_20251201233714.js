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

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.alibaba.com/' } }, (res) => {
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

// Extract full-size image URL from thumbnail URLs in gallery
function extractFullSizeUrl(detailJson) {
  if (!detailJson) return null;

  const gallery = detailJson.gallery || detailJson.imageList || detailJson.images || [];
  
  if (!Array.isArray(gallery) || gallery.length === 0) return null;

  // Look through gallery items
  for (const img of gallery) {
    let url = typeof img === 'string' ? img : img?.url || img?.src;
    if (!url) continue;
    
    // Normalize URL
    if (url.startsWith('//')) url = `https:${url}`;
    if (!url.startsWith('http')) url = `https://${url}`;
    
    // Skip if not alicdn/alibaba
    if (!url.includes('alicdn.com') && !url.includes('alibaba.com')) continue;
    
    // Remove thumbnail suffixes like _80x80.jpg, _50x50.jpg, etc
    // Pattern: _NNxNN.ext at the end
    url = url.replace(/_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i, '.$1');
    
    // Skip known bad patterns
    const dimMatch = url.match(/tps-(\d+)-(\d+)/i);
    if (dimMatch) {
      const width = parseInt(dimMatch[1]);
      const height = parseInt(dimMatch[2]);
      const aspectRatio = width / height;
      
      // Skip thumbnails and banners
      if (width <= 100 && height <= 100) continue;
      if (aspectRatio > 3 && height < 300) continue;
      if (aspectRatio < 0.33 && width < 300) continue;
      if (width === 600 && height === 600) continue;
    }
    
    // This looks like a valid product image
    return url;
  }

  return null;
}

async function fixNoImageListings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Fetching Alibaba listings with no images but have detailJson...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { not: null }
      },
      select: { id: true, title: true, detailJson: true }
    });
    
    console.log(`   Found ${listings.length} listings to process\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noImage = 0;
    
    const batchSize = 20;
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, listings.length)}/${listings.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          // Extract full-size URL from thumbnails
          const imageUrl = extractFullSizeUrl(listing.detailJson);
          
          if (!imageUrl) {
            noImage++;
            return;
          }
          
          // Download image
          const buffer = await downloadImage(imageUrl);
          
          // Verify it's a reasonable size (not a tiny placeholder)
          if (buffer.length < 1000) {
            noImage++;
            console.log(`   ⚠️  Image too small (${buffer.length}b): ${listing.title.substring(0, 40)}...`);
            return;
          }
          
          // Save and upload
          const filename = getCacheFilename(imageUrl);
          const localPath = path.join(__dirname, 'public', 'cache', filename);
          
          let contentType = 'image/jpeg';
          if (filename.endsWith('.png')) contentType = 'image/png';
          else if (filename.endsWith('.webp')) contentType = 'image/webp';
          
          fs.writeFileSync(localPath, buffer);
          await uploadToR2(filename, buffer, contentType);
          
          // Update database
          await prisma.savedListing.update({
            where: { id: listing.id },
            data: { image: `${R2_PUBLIC_URL}/cache/${filename}` }
          });
          
          success++;
          console.log(`   ✅ ${listing.title.substring(0, 40)}...`);
          
        } catch (error) {
          failed++;
          console.log(`   ❌ ${listing.title.substring(0, 40)}... - ${error.message}`);
        }
        
        processed++;
      }));
      
      console.log(`   Batch done - Success: ${success}, Failed: ${failed}, No Image: ${noImage}`);
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Image: ${noImage}`);
    
    // Final stats
    const total = await prisma.savedListing.count({ where: { platform: 'ALIBABA' } });
    const withR2 = await prisma.savedListing.count({
      where: { platform: 'ALIBABA', image: { startsWith: R2_PUBLIC_URL } }
    });
    console.log(`\n📊 Final: ${withR2}/${total} (${(withR2/total*100).toFixed(1)}%) using R2`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNoImageListings();
