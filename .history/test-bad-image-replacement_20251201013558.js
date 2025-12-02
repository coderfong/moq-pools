const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const KNOWN_BAD_HASHES = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb',
  'e7cc244e1d0f558ae9669f57b973758bc14103ee',
];

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

  return scored[0].url;
}

async function testImageSelection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🧪 Testing image selection on bad images...\n');
    
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
      },
      take: 10
    });
    
    console.log(`Testing on ${listings.length} sample listings\n`);
    
    let foundGood = 0;
    let noGood = 0;
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   Current (BAD): ${listing.image}`);
      
      if (listing.detailJson?.gallery) {
        console.log(`   Gallery has ${listing.detailJson.gallery.length} images:`);
        listing.detailJson.gallery.forEach((url, idx) => {
          const good = isGoodProductImage(url);
          const score = good ? scoreImageUrl(url) : 0;
          console.log(`      ${idx + 1}. ${good ? '✅' : '❌'} [${score}] ${url}`);
        });
      }
      
      const bestUrl = extractBestImageUrl(listing.detailJson);
      if (bestUrl) {
        console.log(`   BEST SELECTED: ${bestUrl}`);
        foundGood++;
      } else {
        console.log(`   ⚠️  NO GOOD IMAGE FOUND`);
        noGood++;
      }
      console.log('');
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Found good alternatives: ${foundGood}`);
    console.log(`   ❌ No good alternatives: ${noGood}`);
    console.log(`   Success rate: ${(foundGood / listings.length * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImageSelection();
