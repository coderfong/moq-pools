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

// Extract image URLs from headless-rendered Alibaba page
async function extractImageFromLivePage(url) {
  try {
    let chromium;
    try {
      const req = (0, eval)('require');
      try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
    } catch { return null; }
    
    if (!chromium) return null;
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const ctx = await browser.newContext({ 
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US'
      });
      
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for thumbnail carousel to load
      await page.waitForTimeout(2000);
      
      // Extract images from thumbnail carousel
      const imageUrl = await page.evaluate(() => {
        // Find thumbnail carousel with background-image URLs
        const thumbs = document.querySelectorAll('[data-submodule="ProductImageThumbsList"] [style*="background-image"]');
        
        for (const thumb of thumbs) {
          const style = thumb.getAttribute('style') || '';
          const match = style.match(/background-image:\s*url\(['"]?(.+?)['"]?\)/i);
          if (match) {
            let url = match[1];
            // Remove thumbnail suffix like _80x80.jpg
            const thumbnailMatch = url.match(/^(.+\.(jpg|jpeg|png|webp|gif))_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i);
            if (thumbnailMatch) {
              url = thumbnailMatch[1]; // Get original without thumbnail suffix
            } else {
              // Just remove _NNxNN.ext suffix
              url = url.replace(/_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i, '.$1');
            }
            
            // Normalize to https
            if (url.startsWith('//')) url = `https:${url}`;
            if (!url.startsWith('http')) url = `https://${url}`;
            
            // Validate it looks like a product image
            if (url.includes('alicdn.com') || url.includes('alibaba.com')) {
              return url;
            }
          }
        }
        
        // Fallback: try to get og:image
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          let url = ogImage.getAttribute('content') || '';
          if (url.startsWith('//')) url = `https:${url}`;
          return url || null;
        }
        
        return null;
      });
      
      return imageUrl;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.log(`   Headless error: ${error.message}`);
    return null;
  }
}

async function rescrapeNoImageListings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔄 Re-scraping Alibaba listings with no images...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        url: { not: null }
      },
      select: { id: true, title: true, url: true },
      take: 100 // Start with 100 for testing
    });
    
    console.log(`   Found ${listings.length} listings to re-scrape\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noImage = 0;
    
    for (const listing of listings) {
      try {
        console.log(`\n[${processed + 1}/${listings.length}] ${listing.title.substring(0, 50)}...`);
        console.log(`   URL: ${listing.url}`);
        
        // Extract image from live page
        const imageUrl = await extractImageFromLivePage(listing.url);
        
        if (!imageUrl) {
          noImage++;
          console.log(`   ⚠️  No image found on live page`);
          processed++;
          continue;
        }
        
        console.log(`   📸 Found image: ${imageUrl.substring(0, 80)}...`);
        
        // Download image
        const buffer = await downloadImage(imageUrl);
        
        // Verify it's reasonable size
        if (buffer.length < 1000) {
          noImage++;
          console.log(`   ⚠️  Image too small (${buffer.length}b)`);
          processed++;
          continue;
        }
        
        // Save and upload
        const filename = getCacheFilename(imageUrl);
        const localPath = path.join(__dirname, 'public', 'cache', filename);
        
        let contentType = 'image/jpeg';
        if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.webp')) contentType = 'image/webp';
        
        // Ensure directory exists
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(localPath, buffer);
        await uploadToR2(filename, buffer, contentType);
        
        // Update database
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { 
            image: `${R2_PUBLIC_URL}/cache/${filename}`,
            detailUpdatedAt: new Date()
          }
        });
        
        success++;
        console.log(`   ✅ Success! (${buffer.length} bytes)`);
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        failed++;
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      processed++;
    }
    
    console.log(`\n✨ Batch Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Image: ${noImage}`);
    
    // Final stats
    const total = await prisma.savedListing.count({ where: { platform: 'ALIBABA' } });
    const withR2 = await prisma.savedListing.count({
      where: { platform: 'ALIBABA', image: { startsWith: R2_PUBLIC_URL } }
    });
    console.log(`\n📊 Overall: ${withR2}/${total} (${(withR2/total*100).toFixed(1)}%) using R2`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

rescrapeNoImageListings();
