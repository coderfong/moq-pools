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

// Upgrade Alibaba image URLs to high quality versions (conservative approach)
function upgradeImageQuality(url) {
  if (!url) return url;
  try {
    // For Alibaba CDN images, ONLY upgrade if there's already a size suffix
    // Don't add _960x960 to URLs that don't have it, as those often 404
    if (url.includes('alicdn.com') || url.includes('alibaba.com')) {
      // Only replace existing small sizes with larger ones
      if (/_\d+x\d+\.(jpg|jpeg|png|webp)/i.test(url)) {
        // Replace small sizes: _80x80, _50x50, _220x220 -> _960x960
        url = url.replace(/_(50|80|100|220|300|350)x\1\.(jpg|jpeg|png|webp)/gi, '_960x960.$2');
      }
      // Don't add size suffix if it doesn't exist - those URLs often don't support it
    }
    return url;
  } catch {
    return url;
  }
}

// Download with fallback: try high-quality first, then original if it fails
async function downloadImageWithFallback(url) {
  const highQualityUrl = upgradeImageQuality(url);
  
  // If no upgrade happened, just download normally
  if (highQualityUrl === url) {
    return downloadImage(url);
  }
  
  // Try high quality first
  try {
    return await downloadImage(highQualityUrl);
  } catch (err) {
    // If high quality fails (404 or any error), fall back to original
    if (err.message && (err.message.includes('404') || err.message.includes('400'))) {
      // Silently fall back to original for 404/400
      return downloadImage(url);
    }
    // For other errors, still try original as fallback
    try {
      return await downloadImage(url);
    } catch {
      throw err; // Throw original error if both fail
    }
  }
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

// Extract best image using the pre-vetted heroImage from detail.ts
// This is already filtered to avoid banners, logos, sprites, and badges
function extractBestImageUrl(detailJson) {
  if (!detailJson) return null;
  
  // Priority 1: Use heroImage (already filtered by detail.ts)
  if (detailJson.heroImage) {
    let url = detailJson.heroImage;
    // Ensure https
    if (url.startsWith('//')) url = `https:${url}`;
    if (!url.startsWith('http')) url = `https:${url}`;
    // Upgrade to high quality
    url = upgradeImageQuality(url);
    return url;
  }
  
  // Priority 2: Use first gallery image (also filtered by detail.ts)
  if (detailJson.gallery && Array.isArray(detailJson.gallery) && detailJson.gallery.length > 0) {
    let url = detailJson.gallery[0];
    if (typeof url === 'string') {
      if (url.startsWith('//')) url = `https:${url}`;
      if (!url.startsWith('http')) url = `https:${url}`;
      // Upgrade to high quality
      url = upgradeImageQuality(url);
      return url;
    }
  }
  
  // Priority 3: Fallback to imageList/images if available
  const fallbackSources = [detailJson.imageList, detailJson.images];
  for (const source of fallbackSources) {
    if (Array.isArray(source) && source.length > 0) {
      const img = source[0];
      let url = typeof img === 'string' ? img : img?.url || img?.src;
      if (url) {
        if (url.startsWith('//')) url = `https:${url}`;
        if (!url.startsWith('http')) url = `https:${url}`;
        return url;
      }
    }
  }
  
  return null;
}

async function fixAlibabaImagesFromDetailJson() {
  const prisma = new PrismaClient();
  
  try {
    // Check if we should reprocess existing R2 images with high quality
    const reprocessR2 = process.argv.includes('--reprocess-r2');
    const limit = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || null;
    
    let toProcess;
    
    if (reprocessR2) {
      console.log(`\n🔍 Fetching most recent Alibaba listings with R2 images to upgrade quality...\n`);
      
      const listings = await prisma.savedListing.findMany({
        where: {
          platform: 'ALIBABA',
          image: { startsWith: R2_PUBLIC_URL },
          detailJson: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit || 20000,
        select: { id: true, title: true, detailJson: true, image: true }
      });
      
      console.log(`   Found ${listings.length} listings with R2 images to upgrade\n`);
      toProcess = listings;
    } else {
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
        select: { id: true, title: true, detailJson: true, image: true }
      });
      
      console.log(`   Found ${listings.length} total, processing ${listings.length} without images\n`);
      toProcess = listings;
    }
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noImage = 0;
    
    const batchSize = 20;
    
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, toProcess.length)}/${toProcess.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          // Extract image URL from detailJson
          const imageUrl = extractBestImageUrl(listing.detailJson);
          
          if (!imageUrl) {
            noImage++;
            console.log(`   ⚠️  No image in detailJson: ${listing.title.substring(0, 50)}...`);
            return;
          }
          
          // Download image with quality fallback
          const buffer = await downloadImageWithFallback(imageUrl);
          
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
      
      console.log(`   ✅ Batch done - Success: ${success}, Failed: ${failed}, No Image: ${noImage}`);
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Image in detailJson: ${noImage}`);
    
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
