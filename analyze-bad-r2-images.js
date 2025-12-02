const { PrismaClient } = require('./prisma/generated/client4');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Known bad image hashes (Alibaba headers/blockers)
const KNOWN_BAD_HASHES = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb.png',
  'e7cc244e1d0f558ae9669f57b973758bc14103ee.png',
];

function isLikelyBadImageUrl(url) {
  if (!url) return false;
  
  // Check if it's one of the known bad hashes
  for (const badHash of KNOWN_BAD_HASHES) {
    if (url.includes(badHash)) return true;
  }
  
  // Check for patterns that indicate bad images
  const urlLower = url.toLowerCase();
  
  // Small dimensions often indicate icons/badges
  if (/[_-]\d{1,3}x\d{1,3}[._-]/i.test(url)) {
    const match = url.match(/[_-](\d{1,3})x(\d{1,3})[._-]/i);
    if (match) {
      const w = parseInt(match[1]);
      const h = parseInt(match[2]);
      if (w < 200 || h < 200) return true;
    }
  }
  
  // Known bad patterns from Alibaba
  if (/@img|sprite|logo|favicon|badge|watermark|icon/i.test(urlLower)) return true;
  if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(url)) return true;
  if (urlLower.includes('imgextra') && /[0-9]{4,6}-[0-9]-tps-[0-9]+-[0-9]+/i.test(url)) return true;
  if (/\d{4,6}-\d-tps-\d{2,4}-\d{2,4}\.(png|jpe?g)/i.test(url)) return true;
  
  return false;
}

function getImageSize(buffer) {
  // Simple PNG size detection
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: 'png' };
  }
  
  // Simple JPEG size detection
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    // Simplified - would need more complex parsing for accurate JPEG size
    return { width: 0, height: 0, type: 'jpeg' };
  }
  
  return { width: 0, height: 0, type: 'unknown' };
}

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

async function analyzeBadImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Analyzing R2 images for quality issues...\n');
    
    // Get all Alibaba listings with R2 images
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL },
        detailJson: { not: null }
      },
      select: { 
        id: true, 
        title: true, 
        image: true, 
        detailJson: true 
      },
      take: 1000 // Sample first 1000
    });
    
    console.log(`   Analyzing ${listings.length} listings...\n`);
    
    let knownBad = 0;
    let suspicious = 0;
    let smallImages = 0;
    let good = 0;
    let errors = 0;
    
    const badListings = [];
    
    for (let i = 0; i < Math.min(100, listings.length); i++) {
      const listing = listings[i];
      
      try {
        // Check if it's a known bad hash
        if (KNOWN_BAD_HASHES.some(hash => listing.image.includes(hash))) {
          knownBad++;
          badListings.push({
            id: listing.id,
            title: listing.title,
            image: listing.image,
            reason: 'Known bad hash',
            alternativeCount: listing.detailJson?.gallery?.length || 0
          });
          continue;
        }
        
        // Download and check size
        const buffer = await downloadImage(listing.image);
        const size = getImageSize(buffer);
        
        if (size.type === 'png' && (size.width < 200 || size.height < 200)) {
          smallImages++;
          badListings.push({
            id: listing.id,
            title: listing.title,
            image: listing.image,
            reason: `Small PNG: ${size.width}x${size.height}`,
            alternativeCount: listing.detailJson?.gallery?.length || 0
          });
        } else if (buffer.length < 5000) {
          suspicious++;
          badListings.push({
            id: listing.id,
            title: listing.title,
            image: listing.image,
            reason: `Suspiciously small: ${buffer.length} bytes`,
            alternativeCount: listing.detailJson?.gallery?.length || 0
          });
        } else {
          good++;
        }
        
        if ((i + 1) % 20 === 0) {
          console.log(`   Progress: ${i + 1}/100 analyzed...`);
        }
        
      } catch (error) {
        errors++;
      }
    }
    
    console.log('\n📊 Analysis Results (first 100 images):\n');
    console.log(`   ✅ Good images: ${good}`);
    console.log(`   ❌ Known bad hashes: ${knownBad}`);
    console.log(`   ⚠️  Small images (<200px): ${smallImages}`);
    console.log(`   ⚠️  Suspicious (small file): ${suspicious}`);
    console.log(`   ❗ Errors: ${errors}`);
    console.log(`   📈 Bad rate: ${((knownBad + smallImages + suspicious) / 100 * 100).toFixed(1)}%\n`);
    
    if (badListings.length > 0) {
      console.log('🔍 Sample Bad Listings:\n');
      badListings.slice(0, 10).forEach((bad, i) => {
        console.log(`${i + 1}. ${bad.title.substring(0, 50)}...`);
        console.log(`   Image: ${bad.image}`);
        console.log(`   Reason: ${bad.reason}`);
        console.log(`   Alternatives in gallery: ${bad.alternativeCount}\n`);
      });
    }
    
    // Count total potential bad images
    const totalKnownBad = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { 
          startsWith: R2_PUBLIC_URL,
          OR: KNOWN_BAD_HASHES.map(hash => ({ contains: hash }))
        }
      }
    });
    
    console.log(`\n📊 Total in database with known bad hashes: ${totalKnownBad}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeBadImages();
