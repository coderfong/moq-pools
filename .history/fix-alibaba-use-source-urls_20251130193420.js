/**
 * Fix Alibaba images by using source URLs from detailJson
 * No downloading - just update database with correct URLs
 */

const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs').promises;
const prisma = new PrismaClient();

// Load progress from file
async function loadProgress() {
  try {
    const data = await fs.readFile('alibaba-url-fix-progress.json', 'utf8');
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
    'alibaba-url-fix-progress.json',
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
      // Filter for high-quality JPG images, prioritize @sc04.alicdn.com/kf/ URLs
      const priorityImages = source.filter(img => {
        if (!img) return false;
        const url = typeof img === 'string' ? img : img.url || img.src;
        if (!url) return false;
        
        // Highest priority: @sc04.alicdn.com/kf/ (original quality)
        return url.includes('@sc04.alicdn.com/kf/');
      });

      if (priorityImages.length > 0) {
        const img = priorityImages[0];
        return typeof img === 'string' ? img : img.url || img.src;
      }

      // Second priority: sc04.alicdn.com/kf/ (without @)
      const goodImages = source.filter(img => {
        if (!img) return false;
        const url = typeof img === 'string' ? img : img.url || img.src;
        if (!url) return false;
        return url.includes('sc04.alicdn.com/kf/');
      });

      if (goodImages.length > 0) {
        const img = goodImages[0];
        return typeof img === 'string' ? img : img.url || img.src;
      }

      // Third priority: any alicdn.com JPG
      const alicdnImages = source.filter(img => {
        if (!img) return false;
        const url = typeof img === 'string' ? img : img.url || img.src;
        if (!url) return false;
        return url.includes('alicdn.com') && url.toLowerCase().endsWith('.jpg');
      });

      if (alicdnImages.length > 0) {
        const img = alicdnImages[0];
        return typeof img === 'string' ? img : img.url || img.src;
      }

      // Fallback to first image
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
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]) || 1000;
  const batchSize = 100; // Can be larger since no downloading

  console.log('\n=== Fix Alibaba Images with Source URLs ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Limit: ${limit} listings\n`);

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
    console.log('=== DRY RUN PREVIEW (first 10) ===\n');
    for (let i = 0; i < Math.min(10, listings.length); i++) {
      const listing = listings[i];
      const imageUrl = extractBestImageUrl(listing.detailJson);
      console.log(`${i + 1}. ${listing.url.slice(0, 70)}...`);
      console.log(`   Current: ${listing.image}`);
      console.log(`   New URL: ${imageUrl ? imageUrl.slice(0, 80) + '...' : 'NO IMAGE FOUND'}\n`);
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

    // Process batch in parallel
    const updates = await Promise.allSettled(
      batch.map(async (listing) => {
        const imageUrl = extractBestImageUrl(listing.detailJson);
        
        if (!imageUrl) {
          throw new Error('No image URL found in detailJson');
        }

        // Update database with source URL
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { image: imageUrl },
        });

        return { id: listing.id, url: imageUrl };
      })
    );

    // Count results
    for (let j = 0; j < updates.length; j++) {
      const result = updates[j];
      const listing = batch[j];
      
      if (result.status === 'fulfilled') {
        successCount++;
        if ((successCount + failedCount) % 100 === 0) {
          console.log(`  ✅ ${successCount} updated...`);
        }
      } else {
        failedCount++;
        console.log(`  ❌ Failed: ${result.reason.message}`);
      }

      // Save progress
      progress.lastProcessedId = listing.id;
      progress.processedCount = successCount + failedCount;
      progress.successCount = successCount;
      progress.failedCount = failedCount;
    }

    await saveProgress(progress);
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
