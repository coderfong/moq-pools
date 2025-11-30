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
    if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(x)) return true;
    if (x.includes('imgextra') && /[0-9]{4,6}-[0-9]-tps-[0-9]+-[0-9]+/i.test(x)) return true;
    if (x.match(/\d{4,6}-\d-tps-\d{2,4}-\d{2,4}\.(png|jpe?g)/i)) return true;
    if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(x) && !/_\d{2,4}x\d{2,4}/.test(x)) return true;
    return false;
  } catch {
    return false;
  }
}

function downloadPage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        return downloadPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        return reject(new Error(`Status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        resolve(data);
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

function extractAlibabaImages(html) {
  const images = [];
  
  // Look for high quality image URLs in various patterns
  const patterns = [
    /"imageUrl":"([^"]+)"/g,
    /"image":"([^"]+)"/g,
    /"imgUrl":"([^"]+)"/g,
    /data-src="([^"]+)"/g,
    /<img[^>]+src="([^"]+)"/g,
    /"productImage":"([^"]+)"/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.includes('alicdn.com') || url.includes('alibaba.com')) {
        // Upgrade to larger size
        url = url.replace(/_\d+x\d+\.(jpg|png|webp)/i, '_960x960.$1');
        url = url.replace(/\.jpg_\d+x\d+/i, '.jpg_960x960');
        if (!isAlibabaBadImageUrl(url)) {
          images.push(url);
        }
      }
    }
  }
  
  return [...new Set(images)];
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

async function scrapeAndFixMissingImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Fetching Alibaba listings with missing images...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        sourceUrl: { not: null }
      },
      select: { id: true, sourceUrl: true, title: true },
      take: 30847
    });
    
    console.log(`   Found ${listings.length} listings to fix\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    const batchSize = 20;
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      console.log(`\n[${i + 1}-${Math.min(i + batchSize, listings.length)}/${listings.length}] Processing batch...`);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          if (!listing.sourceUrl) {
            skipped++;
            return;
          }
          
          // Download the product page
          const html = await downloadPage(listing.sourceUrl);
          
          // Extract image URLs
          const imageUrls = extractAlibabaImages(html);
          
          if (imageUrls.length === 0) {
            failed++;
            console.log(`   ❌ No images found: ${listing.title.substring(0, 50)}...`);
            return;
          }
          
          // Try to download first good image
          let imageBuffer = null;
          let imageUrl = null;
          
          for (const url of imageUrls.slice(0, 5)) {
            try {
              imageBuffer = await downloadImage(url);
              imageUrl = url;
              break;
            } catch (err) {
              // Try next image
            }
          }
          
          if (!imageBuffer) {
            failed++;
            return;
          }
          
          // Save and upload
          const filename = getCacheFilename(imageUrl);
          const localPath = path.join(__dirname, 'public', 'cache', filename);
          
          let contentType = 'image/jpeg';
          if (filename.endsWith('.png')) contentType = 'image/png';
          else if (filename.endsWith('.webp')) contentType = 'image/webp';
          
          fs.writeFileSync(localPath, imageBuffer);
          await uploadToR2(filename, imageBuffer, contentType);
          
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
      
      console.log(`   ✅ Batch done - Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);
    
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

scrapeAndFixMissingImages();
