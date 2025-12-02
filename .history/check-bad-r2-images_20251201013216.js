const { PrismaClient } = require('./prisma/generated/client4');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Check if an image URL is likely bad (small file size suggests header/blocker)
function downloadImageMetadata(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        return reject(new Error(`Status ${res.statusCode}`));
      }
      
      const contentLength = parseInt(res.headers['content-length'] || '0');
      const contentType = res.headers['content-type'] || '';
      
      // Abort - we don't need the full image
      res.destroy();
      clearTimeout(timeout);
      
      resolve({ size: contentLength, type: contentType });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function isLikelyBadImageUrl(url) {
  const u = url.toLowerCase();
  
  // Known bad patterns
  if (u.includes('tps-') || u.includes('@img') || u.includes('sprite')) {
    return true;
  }
  
  // Specific bad hashes you mentioned
  const badHashes = [
    '4e70cc58277297de2d4741c437c9dc425c4f8adb',
    'e7cc244e1d0f558ae9669f57b973758bc14103ee',
  ];
  
  for (const hash of badHashes) {
    if (u.includes(hash)) {
      return true;
    }
  }
  
  return false;
}

async function checkBadR2Images() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Checking for bad R2 images...\n');
    
    // Get all R2 images
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL }
      },
      select: {
        id: true,
        title: true,
        image: true,
        detailJson: true
      }
    });
    
    console.log(`Found ${listings.length} listings with R2 images\n`);
    
    const suspects = [];
    const confirmed = [];
    let checked = 0;
    
    console.log('Checking for suspicious patterns and file sizes...\n');
    
    for (const listing of listings) {
      // Quick pattern check
      if (isLikelyBadImageUrl(listing.image)) {
        suspects.push({ ...listing, reason: 'Pattern match' });
        console.log(`⚠️  Suspect: ${listing.title.substring(0, 50)}... (pattern)`);
        continue;
      }
      
      // Check first 100 for file size
      if (checked < 100) {
        try {
          const meta = await downloadImageMetadata(listing.image);
          
          // PNG images under 50KB are suspicious
          // JPG images under 20KB are suspicious
          const isSuspicious = 
            (listing.image.endsWith('.png') && meta.size < 50000) ||
            (listing.image.match(/\.(jpg|jpeg)$/i) && meta.size < 20000);
          
          if (isSuspicious) {
            suspects.push({ 
              ...listing, 
              reason: `Small file (${(meta.size/1024).toFixed(1)}KB)`,
              size: meta.size
            });
            console.log(`⚠️  Suspect: ${listing.title.substring(0, 50)}... (${(meta.size/1024).toFixed(1)}KB)`);
          }
          
          checked++;
          
          if (checked % 10 === 0) {
            console.log(`   Checked ${checked}/100 images...`);
          }
        } catch (err) {
          // Skip errors
        }
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   Total R2 images: ${listings.length}`);
    console.log(`   Suspicious images: ${suspects.length}`);
    console.log(`   Checked sizes: ${checked}`);
    
    if (suspects.length > 0) {
      console.log(`\n🔍 Sample suspicious images:\n`);
      suspects.slice(0, 10).forEach((s, i) => {
        console.log(`${i+1}. ${s.title.substring(0, 60)}...`);
        console.log(`   Image: ${s.image}`);
        console.log(`   Reason: ${s.reason}`);
        console.log(`   Has detailJson.gallery: ${s.detailJson?.gallery?.length || 0} images`);
        console.log('');
      });
      
      console.log(`\n💡 To fix these, run:`);
      console.log(`   node fix-bad-r2-images.js`);
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      totalR2Images: listings.length,
      suspiciousCount: suspects.length,
      checkedSizes: checked,
      suspects: suspects.slice(0, 50).map(s => ({
        id: s.id,
        title: s.title,
        image: s.image,
        reason: s.reason,
        hasGallery: s.detailJson?.gallery?.length || 0,
      }))
    };
    
    require('fs').writeFileSync(
      'bad-r2-images-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📄 Report saved to: bad-r2-images-report.json`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBadR2Images();
