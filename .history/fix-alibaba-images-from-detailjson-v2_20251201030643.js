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

// Known bad URLs that should NEVER be cached
const BLOCKED_URLS = [
  'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
];

function isBlockedUrl(url) {
  if (!url) return false;
  // Normalize URL
  let normalized = url.startsWith('//') ? `https:${url}` : url;
  if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
  
  return BLOCKED_URLS.includes(normalized);
}

function isValidProductImage(url) {
  if (!url) return false;
  
  // Check if blocked
  if (isBlockedUrl(url)) return false;
  
  // Must be alicdn or alibaba domain
  if (!url.includes('alicdn.com') && !url.includes('alibaba.com')) return false;
  
  // Filter out small thumbnails and banners by dimension patterns
  // Match format: tps-WIDTHxHEIGHT (e.g., tps-600-600, tps-920-110)
  const tpsMatch = url.match(/tps-(\d+)-(\d+)/i);
  if (tpsMatch) {
    const width = parseInt(tpsMatch[1]);
    const height = parseInt(tpsMatch[2]);
    
    // Block if BOTH dimensions are small (thumbnails like 80x80, 50x50)
    if (width <= 100 && height <= 100) return false;
    
    // Block if it's a wide banner (wide but short, like 920x110, 3840x80)
    if (width >= 900 && height <= 200) return false;
    
    // Block if it's a tall banner (short but tall, like 80x3840)
    if (width <= 200 && height >= 900) return false;
    
    // Block specific known bad dimensions
    if (width === 600 && height === 600) return false; // The bad placeholder
  }
  
  // Also check for _80x80, _50x50 style thumbnails
  if (/_\d{2,3}x\d{2,3}\./i.test(url)) {
    const dimMatch = url.match(/_(\d+)x(\d+)\./i);
    if (dimMatch) {
      const width = parseInt(dimMatch[1]);
      const height = parseInt(dimMatch[2]);
      if (width <= 100 && height <= 100) return false;
    }
  }
  
  return true;
}

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

// Extract best VALID image from detailJson (filtering out placeholders)
function extractBestImageUrl(detailJson) {
  if (!detailJson) return null;

  // Try different image fields
  const imageSources = [
    detailJson.gallery,
    detailJson.imageList,
    detailJson.images,
    detailJson.heroImage ? [detailJson.heroImage] : null,
    detailJson.image ? [detailJson.image] : null,
  ];

  for (const source of imageSources) {
    if (!source) continue;

    if (Array.isArray(source) && source.length > 0) {
      // Get first VALID image from array
      for (const img of source) {
        let url = typeof img === 'string' ? img : img?.url || img?.src;
        if (!url) continue;
        
        // Normalize URL
        if (url.startsWith('//')) url = `https:${url}`;
        if (!url.startsWith('http')) url = `https://${url}`;
        
        // Check if valid product image
        if (isValidProductImage(url)) {
          return url;
        }
      }
    } else if (typeof source === 'string') {
      let url = source;
      if (url.startsWith('//')) url = `https:${url}`;
      if (!url.startsWith('http')) url = `https://${url}`;
      
      if (isValidProductImage(url)) {
        return url;
      }
    }
  }

  return null;
}

async function fixAlibabaImagesFromDetailJson() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Fetching Alibaba listings with detailJson but no images...\n');
    
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
    
    console.log(`   Found ${listings.length} listings to fix\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noImage = 0;
    let blocked = 0;
    
    const batchSize = 20;
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, listings.length)}/${listings.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          // Extract image URL from detailJson (now with filtering)
          const imageUrl = extractBestImageUrl(listing.detailJson);
          
          if (!imageUrl) {
            noImage++;
            console.log(`   ⚠️  No valid image in detailJson: ${listing.title.substring(0, 50)}...`);
            return;
          }
          
          // Double-check it's not blocked (shouldn't happen but just in case)
          if (isBlockedUrl(imageUrl)) {
            blocked++;
            console.log(`   🚫 Blocked placeholder: ${listing.title.substring(0, 50)}...`);
            return;
          }
          
          // Download image
          const buffer = await downloadImage(imageUrl);
          
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
          
        } catch (error) {
          failed++;
          console.log(`   ❌ ${listing.title.substring(0, 40)}... - ${error.message}`);
        }
        
        processed++;
      }));
      
      console.log(`   ✅ Batch done - Success: ${success}, Failed: ${failed}, No Image: ${noImage}, Blocked: ${blocked}`);
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Image in detailJson: ${noImage}`);
    console.log(`   Blocked (placeholders): ${blocked}`);
    
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

fixAlibabaImagesFromDetailJson();
