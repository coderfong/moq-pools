/**
 * Fix Alibaba images by caching them from source URLs
 * This uses the existing cacheExternalImage infrastructure
 */

const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs').promises;
const path = require('path');
const prisma = new PrismaClient();

// Import the caching function (using dynamic import since it's TypeScript)
let cacheExternalImage;

async function loadImageCache() {
  try {
    // Try to load the compiled version
    const mod = await import('./src/lib/imageCache.js');
    cacheExternalImage = mod.cacheExternalImage;
    return true;
  } catch (e1) {
    try {
      // Fall back to ts-node if available
      require('ts-node/register');
      const mod = require('./src/lib/imageCache.ts');
      cacheExternalImage = mod.cacheExternalImage;
      return true;
    } catch (e2) {
      console.error('❌ Could not load imageCache module');
      console.error('Please run: pnpm install ts-node');
      return false;
    }
  }
}

// Load progress from file
async function loadProgress() {
  try {
    const data = await fs.readFile('alibaba-cache-progress.json', 'utf8');
    return JSON.parse(data);
  } catch {
    return { 
      lastProcessedId: null,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      startTime: new Date().toISOString()
    };
  }
}

// Save progress to file
async function saveProgress(progress) {
  await fs.writeFile(
    'alibaba-cache-progress.json',
    JSON.stringify(progress, null, 2)
  );
}

// Extract best image URL from detailJson
function extractBestImageUrl(detailJson) {
  if (!detailJson) return null;

  const data = typeof detailJson === 'string' ? JSON.parse(detailJson) : detailJson;
  
  // Try different image fields
  const imageSources = [
    data.imageList,
    data.images,
    data.productImages,
    data.image,
  ];

  for (const source of imageSources) {
    if (!source) continue;

    if (Array.isArray(source)) {
      // Filter for high-quality JPG images
      const goodImages = source.filter(img => {
        if (!img) return false;
        const url = typeof img === 'string' ? img : img.url || img.src;
        if (!url) return false;
        
        // Prefer @sc04.alicdn.com/kf/ URLs (original quality)
        if (url.includes('@sc04.alicdn.com/kf/')) return true;
        if (url.includes('sc04.alicdn.com/kf/')) return true;
        
        // Accept other alicdn URLs
        if (url.includes('alicdn.com') && url.toLowerCase().endsWith('.jpg')) return true;
        
        return false;
      });

      if (goodImages.length > 0) {
        const firstGood = goodImages[0];
        return typeof firstGood === 'string' ? firstGood : firstGood.url || firstGood.src;
      }

      // Fallback to any image
      if (source.length > 0) {
        const first = source[0];
        return typeof first === 'string' ? first : first.url || first.src;
      }
    } else if (typeof source === 'string') {
      return source;
    }
  }

  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]) || 100;
  const batchSize = 10;
  const delayMs = 3000; // 3 seconds between batches

  console.log('\n=== Fix Alibaba Images with Cache ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Delay: ${delayMs}ms between batches`);
  console.log(`Limit: ${limit} listings\n`);

  // Load image cache module
  if (!await loadImageCache()) {
    process.exit(1);
  }

  // Load progress
  const progress = await loadProgress();
  console.log(`Resuming from: ${progress.lastProcessedId || 'beginning'}`);
  console.log(`Previous progress: ${progress.successCount} success, ${progress.failedCount} failed\n`);

  // Find Alibaba listings with /cache/ images
  const where = {
    platform: 'ALIBABA',
    image: { startsWith: '/cache/' },
    detailJson: { not: null },
  };

  if (progress.lastProcessedId) {
    where.id = { gt: progress.lastProcessedId };
  }

  const listings = await prisma.savedListing.findMany({
    where,
    select: {
      id: true,
      url: true,
      image: true,
      detailJson: true,
    },
    take: limit,
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${listings.length} Alibaba listings to process\n`);

  if (dryRun) {
    console.log('=== DRY RUN PREVIEW (first 5) ===\n');
    for (let i = 0; i < Math.min(5, listings.length); i++) {
      const listing = listings[i];
      const imageUrl = extractBestImageUrl(listing.detailJson);
      console.log(`${i + 1}. ${listing.url.slice(0, 80)}`);
      console.log(`   Current: ${listing.image}`);
      console.log(`   Would cache: ${imageUrl || 'NO IMAGE FOUND'}\n`);
    }
    console.log(`Total to process: ${listings.length}`);
    return;
  }

  let successCount = progress.successCount;
  let failedCount = progress.failedCount;

  // Process in batches
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(listings.length / batchSize);

    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing listings ${i + 1}-${Math.min(i + batchSize, listings.length)}...`);

    for (const listing of batch) {
      try {
        const imageUrl = extractBestImageUrl(listing.detailJson);
        
        if (!imageUrl) {
          console.log(`⚠️  No image URL found in detailJson`);
          failedCount++;
          continue;
        }

        // Use existing cacheExternalImage infrastructure
        const { localPath } = await cacheExternalImage(imageUrl);

        // Update database
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { image: localPath },
        });

        console.log(`✅ Cached: ${localPath}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        failedCount++;
      }

      // Save progress after each listing
      progress.lastProcessedId = listing.id;
      progress.processedCount = successCount + failedCount;
      progress.successCount = successCount;
      progress.failedCount = failedCount;
      await saveProgress(progress);
    }

    // Delay between batches
    if (i + batchSize < listings.length) {
      console.log(`Waiting ${delayMs / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total processed: ${successCount + failedCount}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success rate: ${((successCount / (successCount + failedCount)) * 100).toFixed(1)}%`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
