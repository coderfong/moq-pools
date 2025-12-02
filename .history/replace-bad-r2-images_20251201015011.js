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

// Known bad image hashes to replace
const KNOWN_BAD_HASHES = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb',
  'e7cc244e1d0f558ae9669f57b973758bc14103ee',
];

function getCacheFilename(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const ext = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
  return `${hash}.${ext}`;
}

function isGoodProductImage(url) {
  if (!url || typeof url !== 'string') return false;
  
  const urlLower = url.toLowerCase();
  
  // REJECT: Icons, badges, watermarks
  if (/@img|sprite|logo|favicon|badge|watermark|icon/i.test(urlLower)) {
    return false;
  }
  
  // REJECT: TPS pattern (these are UI elements/banners)
  if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(url)) {
    return false;
  }
  
  if (urlLower.includes('imgextra') && /[0-9]{4,6}-[0-9]-tps-[0-9]+-[0-9]+/i.test(url)) {
    return false;
  }
  
  if (/\d{4,6}-\d-tps-\d{2,4}-\d{2,4}\.(png|jpe?g)/i.test(url)) {
    return false;
  }
  
  // REJECT: Very small dimensions (thumbnails/icons)
  if (/[_-](\d{1,3})x(\d{1,3})[._-]/i.test(url)) {
    const match = url.match(/[_-](\d{1,3})x(\d{1,3})[._-]/i);
    if (match) {
      const w = parseInt(match[1]);
      const h = parseInt(match[2]);
      if (w < 200 || h < 200) return false;
    }
  }
  
  // ACCEPT: Must be from Alibaba CDN
  if (!url.includes('alicdn.com') && !url.includes('alibaba.com')) {
    return false;
  }
  
  // ACCEPT: Looks like a product image
  return true;
}

function scoreImageUrl(url) {
  if (!url) return 0;
  
  let score = 100;
  
  // Prefer sc04.alicdn.com/kf/ (original quality)
  if (url.includes('sc04.alicdn.com/kf/')) {
    score += 50;
  }
  
  // Prefer specific size patterns
  if (url.includes('_960x960')) score += 30;
  else if (url.includes('_800x800')) score += 25;
  else if (url.includes('_640x640')) score += 20;
  else if (url.includes('_480x480')) score += 15;
  else if (url.includes('_350x350')) score += 10;
  
  // Prefer JPG over PNG for product images
  if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().includes('.jpg_')) {
    score += 10;
  }
  
  // Penalize if it has size in filename (might be thumbnail)
  if (/\d{2,4}x\d{2,4}/i.test(url)) {
    const match = url.match(/(\d{2,4})x(\d{2,4})/i);
    if (match) {
      const w = parseInt(match[1]);
      const h = parseInt(match[2]);
      if (w >= 600 && h >= 600) score += 20;
    }
  }
  
  return score;
}

function extractBestImageUrl(detailJson) {
  if (!detailJson) return null;

  const candidates = [];
  
  // Collect all possible images
  const sources = [
    detailJson.gallery,
    detailJson.imageList,
    detailJson.images,
    detailJson.heroImage ? [detailJson.heroImage] : null,
    detailJson.image ? [detailJson.image] : null,
  ];

  for (const source of sources) {
    if (!source) continue;

    if (Array.isArray(source)) {
      for (const img of source) {
        const url = typeof img === 'string' ? img : img?.url || img?.src;
        if (url && isGoodProductImage(url)) {
          candidates.push(url);
        }
      }
    } else if (typeof source === 'string' && isGoodProductImage(source)) {
      candidates.push(source);
    }
  }

  if (candidates.length === 0) return null;

  // Score and sort candidates
  const scored = candidates.map(url => ({
    url,
    score: scoreImageUrl(url)
  })).sort((a, b) => b.score - a.score);

  // Return best candidate
  let bestUrl = scored[0].url;
  
  // Ensure https
  if (bestUrl.startsWith('//')) bestUrl = `https:${bestUrl}`;
  if (!bestUrl.startsWith('http')) bestUrl = `https:${bestUrl}`;
  
  return bestUrl;
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

async function replaceBadImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Finding listings with bad R2 images...\n');
    
    // Build OR conditions for all bad hashes
    const badHashConditions = KNOWN_BAD_HASHES.map(hash => ({
      image: { contains: hash }
    }));
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: badHashConditions,
        detailJson: { not: null }
      },
      select: { 
        id: true, 
        title: true, 
        image: true,
        detailJson: true 
      }
    });
    
    console.log(`   Found ${listings.length} listings with bad images\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noAlternative = 0;
    
    const batchSize = 10;
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, listings.length)}/${listings.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          // Extract BEST image URL from detailJson (with filtering)
          const imageUrl = extractBestImageUrl(listing.detailJson);
          
          if (!imageUrl) {
            noAlternative++;
            console.log(`   ⚠️  No good alternative: ${listing.title.substring(0, 50)}...`);
            return;
          }
          
          // Download image
          const buffer = await downloadImage(imageUrl);
          
          // Check if image is too small (might still be bad)
          if (buffer.length < 5000) {
            console.log(`   ⚠️  Alternative too small (${buffer.length} bytes): ${listing.title.substring(0, 40)}...`);
            noAlternative++;
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
          console.log(`   ✅ Fixed: ${listing.title.substring(0, 50)}...`);
          
        } catch (error) {
          failed++;
          console.log(`   ❌ ${listing.title.substring(0, 40)}... - ${error.message}`);
        }
        
        processed++;
      }));
      
      console.log(`   Progress - Success: ${success}, Failed: ${failed}, No Alternative: ${noAlternative}`);
      
      // Small delay between batches
      if (i + batchSize < listings.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Good Alternative: ${noAlternative}`);
    
    // Check remaining bad images
    console.log('\n📊 Checking for remaining bad images...\n');
    for (const hash of KNOWN_BAD_HASHES) {
      const count = await prisma.savedListing.count({
        where: {
          platform: 'ALIBABA',
          image: { contains: hash }
        }
      });
      console.log(`   Hash ${hash.substring(0, 12)}...: ${count} remaining`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

replaceBadImages();
