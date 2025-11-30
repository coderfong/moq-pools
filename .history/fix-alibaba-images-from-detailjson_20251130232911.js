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

// Extract product images from the proper carousel module
function extractProductImageUrls(detailJson) {
  if (!detailJson) return [];
  
  const images = [];
  
  // Look for product image module in HTML content
  const htmlContent = detailJson.html || detailJson.content || '';
  
  if (htmlContent) {
    // Extract from product image carousel: div[data-module="MainImage"]
    // Look for img tags with src containing alicdn.com and _960x960 (product images)
    const productImageRegex = /src="(\/\/s\.alicdn\.com\/@sc04\/kf\/[^"]+_960x960[^"]+\.jpg)"/g;
    const matches = [...htmlContent.matchAll(productImageRegex)];
    
    for (const match of matches) {
      const url = match[1];
      if (url && !images.includes(url)) {
        images.push(`https:${url}`);
      }
    }
    
    // Also check background-image style for thumbnail carousel
    const bgImageRegex = /background-image:\s*url\(&quot;(\/\/s\.alicdn\.com\/@sc04\/kf\/[^"&]+\.jpg)_\d+x\d+\.jpg&quot;\)/g;
    const bgMatches = [...htmlContent.matchAll(bgImageRegex)];
    
    for (const match of bgMatches) {
      const baseUrl = match[1];
      // Get high-res version
      const highResUrl = `https:${baseUrl}.jpg_960x960q80.jpg`;
      if (!images.includes(highResUrl)) {
        images.push(highResUrl);
      }
    }
  }
  
  // Fallback: try standard JSON fields if no HTML images found
  if (images.length === 0) {
    const imageSources = [
      detailJson.gallery,
      detailJson.imageList,
      detailJson.images,
    ];

    for (const source of imageSources) {
      if (!source) continue;

      if (Array.isArray(source) && source.length > 0) {
        for (const img of source) {
          const url = typeof img === 'string' ? img : img?.url || img?.src;
          if (url && url.includes('alicdn.com/@sc04/kf/')) {
            let finalUrl = url.startsWith('//') ? `https:${url}` : url;
            if (!finalUrl.startsWith('http')) finalUrl = `https:${finalUrl}`;
            
            // Ensure high quality
            if (!finalUrl.includes('_960x960') && !finalUrl.includes('_720x720')) {
              finalUrl = finalUrl.replace(/\.(jpg|jpeg|png).*$/i, '.jpg_960x960q80.jpg');
            }
            
            if (!images.includes(finalUrl)) {
              images.push(finalUrl);
            }
          }
        }
      }
    }
  }
  
  return images;
}

// Get best product image (avoid banners, logos, etc)
function extractBestImageUrl(detailJson) {
  const images = extractProductImageUrls(detailJson);
  
  if (images.length === 0) return null;
  
  // Filter out likely banner/logo images by checking dimensions in URL
  const productImages = images.filter(url => {
    // Product images usually have _960x960 or similar square dimensions
    // Banner images often have wide dimensions like _1920x400
    const hasSquareDimensions = /_\d+x\d+/.test(url) && !/_\d{4,}x\d{2,3}/.test(url) && !/_\d{2,3}x\d{4,}/.test(url);
    const hasProductPath = url.includes('/@sc04/kf/');
    const notTooSmall = !url.includes('_80x80') && !url.includes('_40x40');
    
    return hasSquareDimensions && hasProductPath && notTooSmall;
  });
  
  // Return first valid product image, or fallback to first image if filters too aggressive
  return productImages[0] || images[0];
}

async function fixAlibabaImagesFromDetailJson() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Fetching Alibaba listings with detailJson but no images...\n');
    
    // Only process listings that truly have no image OR have bad images we're replacing
    const skipExisting = !process.argv.includes('--replace-all');
    
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
    
    // Filter out any that somehow got images since query
    const toProcess = skipExisting 
      ? listings.filter(l => !l.image || l.image === '')
      : listings;
    
    console.log(`   Found ${listings.length} listings to fix\n`);
    
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
          // Extract image URL from detailJson
          const imageUrl = extractBestImageUrl(listing.detailJson);
          
          if (!imageUrl) {
            noImage++;
            console.log(`   ⚠️  No image in detailJson: ${listing.title.substring(0, 50)}...`);
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
