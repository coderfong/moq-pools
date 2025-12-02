// Re-scrape listings with no images using the existing detail.ts scraper
const { PrismaClient } = require('./prisma/generated/client4');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Import the existing detail fetcher
const { fetchAlibabaDetail } = require('./src/lib/providers/detail.ts');

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

async function rescrapeUsingDetailFetcher() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔄 Re-scraping Alibaba listings using detail.ts fetcher...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        url: { not: '' },
        OR: [
          { image: null },
          { image: '' }
        ]
      },
      select: { id: true, title: true, url: true },
      take: 50 // Smaller batch since this uses headless
    });
    
    console.log(`   Found ${listings.length} listings to re-scrape\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    let noImage = 0;
    
    for (const listing of listings) {
      try {
        console.log(`\n[${processed + 1}/${listings.length}] ${listing.title.substring(0, 50)}...`);
        
        // Use the existing detail fetcher
        const detail = await fetchAlibabaDetail(listing.url);
        
        if (!detail || !detail.heroImage) {
          noImage++;
          console.log(`   ⚠️  No hero image in scraped detail`);
          processed++;
          continue;
        }
        
        const imageUrl = detail.heroImage;
        console.log(`   📸 Found: ${imageUrl.substring(0, 80)}...`);
        
        // Download
        const buffer = await downloadImage(imageUrl);
        
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
        
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(localPath, buffer);
        await uploadToR2(filename, buffer, contentType);
        
        // Update database
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { 
            image: `${R2_PUBLIC_URL}/cache/${filename}`,
            detailJson: detail,
            detailUpdatedAt: new Date()
          }
        });
        
        success++;
        console.log(`   ✅ Success! (${buffer.length} bytes)`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        failed++;
        console.log(`   ❌ ${error.message}`);
      }
      
      processed++;
    }
    
    console.log(`\n✨ Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   No Image: ${noImage}`);
    
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

rescrapeUsingDetailFetcher();
