const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

function isLowQualityImageUrl(url) {
  if (!url) return false;
  
  const lower = url.toLowerCase();
  
  // Check for small thumbnails
  if (/_50x50\.|_80x80\.|_100x100\.|_120x120\./i.test(lower)) {
    return true;
  }
  
  // Check for icon/badge/sprite URLs
  if (/@img|sprite|logo|favicon|badge|watermark|icon/i.test(lower)) {
    return true;
  }
  
  // Check for TPS pattern (often UI elements)
  if (/tps-[0-9]+-[0-9]+\.(png|jpg|jpeg)$/i.test(lower)) {
    return true;
  }
  
  // Check for small TPS dimensions
  if (/tps-\d{1,3}-\d{1,3}\./i.test(lower)) {
    return true;
  }
  
  // Check for kf pattern with no dimensions (often small icons)
  if (/\/kf\/h[a-z0-9]{16,}[a-z]?\.(?:png|jpe?g)(?:$|\?)/i.test(lower) && !/_\d{2,4}x\d{2,4}/.test(lower)) {
    return true;
  }
  
  return false;
}

function getImageQuality(url) {
  if (!url) return 'NONE';
  
  const lower = url.toLowerCase();
  
  // Check for high quality indicators
  if (/_960x960\.|_800x800\.|_750x750\./i.test(lower)) return 'HIGH';
  if (/_600x600\.|_640x640\./i.test(lower)) return 'MEDIUM';
  if (/_350x350\.|_400x400\./i.test(lower)) return 'LOW_MEDIUM';
  if (/_220x220\.|_200x200\./i.test(lower)) return 'LOW';
  if (/_120x120\.|_100x100\.|_80x80\.|_50x50\./i.test(lower)) return 'THUMBNAIL';
  
  // Check for problematic patterns
  if (isLowQualityImageUrl(url)) return 'BAD';
  
  // Check if it's an original (no size modifier)
  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower) && !/_\d+x\d+\./i.test(lower)) {
    return 'ORIGINAL';
  }
  
  return 'UNKNOWN';
}

async function analyzeR2ImageQuality() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📊 Analyzing R2 Image Quality...\n');
    
    // Get all Alibaba listings with R2 images
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
    
    const qualityStats = {
      HIGH: 0,
      MEDIUM: 0,
      LOW_MEDIUM: 0,
      LOW: 0,
      THUMBNAIL: 0,
      BAD: 0,
      ORIGINAL: 0,
      UNKNOWN: 0,
      NONE: 0
    };
    
    const badImages = [];
    const thumbnails = [];
    const hasBeeterInDetailJson = [];
    
    for (const listing of listings) {
      const quality = getImageQuality(listing.image);
      qualityStats[quality]++;
      
      if (quality === 'BAD') {
        badImages.push(listing);
      }
      
      if (quality === 'THUMBNAIL' || quality === 'LOW') {
        thumbnails.push(listing);
      }
      
      // Check if detailJson has better images
      if (listing.detailJson?.gallery && Array.isArray(listing.detailJson.gallery)) {
        const betterImages = listing.detailJson.gallery.filter(url => {
          const q = getImageQuality(url);
          return q === 'HIGH' || q === 'MEDIUM' || q === 'ORIGINAL';
        });
        
        if (betterImages.length > 0 && (quality === 'THUMBNAIL' || quality === 'LOW' || quality === 'BAD')) {
          hasBeeterInDetailJson.push({
            ...listing,
            currentQuality: quality,
            betterOptions: betterImages
          });
        }
      }
    }
    
    console.log('='.repeat(80));
    console.log('IMAGE QUALITY BREAKDOWN');
    console.log('='.repeat(80));
    console.log(`✅ HIGH (960x960, 800x800):     ${qualityStats.HIGH.toString().padStart(6)} (${(qualityStats.HIGH/listings.length*100).toFixed(1)}%)`);
    console.log(`✅ ORIGINAL (no dimensions):    ${qualityStats.ORIGINAL.toString().padStart(6)} (${(qualityStats.ORIGINAL/listings.length*100).toFixed(1)}%)`);
    console.log(`⚠️  MEDIUM (600x600, 640x640):  ${qualityStats.MEDIUM.toString().padStart(6)} (${(qualityStats.MEDIUM/listings.length*100).toFixed(1)}%)`);
    console.log(`⚠️  LOW_MEDIUM (350x350):       ${qualityStats.LOW_MEDIUM.toString().padStart(6)} (${(qualityStats.LOW_MEDIUM/listings.length*100).toFixed(1)}%)`);
    console.log(`❌ LOW (200x200, 220x220):      ${qualityStats.LOW.toString().padStart(6)} (${(qualityStats.LOW/listings.length*100).toFixed(1)}%)`);
    console.log(`❌ THUMBNAIL (≤120x120):        ${qualityStats.THUMBNAIL.toString().padStart(6)} (${(qualityStats.THUMBNAIL/listings.length*100).toFixed(1)}%)`);
    console.log(`❌ BAD (icons, UI elements):    ${qualityStats.BAD.toString().padStart(6)} (${(qualityStats.BAD/listings.length*100).toFixed(1)}%)`);
    console.log(`❓ UNKNOWN:                     ${qualityStats.UNKNOWN.toString().padStart(6)} (${(qualityStats.UNKNOWN/listings.length*100).toFixed(1)}%)`);
    console.log('='.repeat(80));
    
    const problemCount = qualityStats.BAD + qualityStats.THUMBNAIL + qualityStats.LOW;
    console.log(`\n🎯 TOTAL PROBLEMATIC: ${problemCount} (${(problemCount/listings.length*100).toFixed(1)}%)`);
    console.log(`   Can be improved: ${hasBeeterInDetailJson.length}\n`);
    
    // Show examples of bad images
    if (badImages.length > 0) {
      console.log('\n❌ SAMPLE BAD IMAGES (UI elements, icons):\n');
      badImages.slice(0, 5).forEach((l, i) => {
        console.log(`${i+1}. ${l.title.substring(0, 60)}...`);
        console.log(`   Image: ${l.image}`);
        console.log(`   Has gallery: ${l.detailJson?.gallery ? `YES (${l.detailJson.gallery.length} images)` : 'NO'}\n`);
      });
    }
    
    // Show examples of thumbnails
    if (thumbnails.length > 0) {
      console.log('\n⚠️  SAMPLE THUMBNAILS/LOW QUALITY:\n');
      thumbnails.slice(0, 5).forEach((l, i) => {
        console.log(`${i+1}. ${l.title.substring(0, 60)}...`);
        console.log(`   Image: ${l.image}`);
        console.log(`   Has gallery: ${l.detailJson?.gallery ? `YES (${l.detailJson.gallery.length} images)` : 'NO'}\n`);
      });
    }
    
    // Show examples where better images exist
    if (hasBeeterInDetailJson.length > 0) {
      console.log('\n🔄 SAMPLE LISTINGS WITH BETTER OPTIONS IN DETAILJSON:\n');
      hasBeeterInDetailJson.slice(0, 5).forEach((l, i) => {
        console.log(`${i+1}. ${l.title.substring(0, 60)}...`);
        console.log(`   Current (${l.currentQuality}): ${l.image}`);
        console.log(`   Better option: ${l.betterOptions[0]}`);
        console.log(`   Quality: ${getImageQuality(l.betterOptions[0])}\n`);
      });
      
      console.log(`💡 TIP: Run fix script with --upgrade flag to replace low quality images\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeR2ImageQuality();
