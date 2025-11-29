/**
 * Fix Alibaba images by re-scraping with existing infrastructure
 * Runs directly without needing the dev server
 */

// Setup ts-node to load TypeScript modules
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  }
});

// Setup path mapping
const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');
tsConfigPaths.register({
  baseUrl: './',
  paths: tsConfig.compilerOptions.paths
});

const { PrismaClient } = require('./prisma/generated/client4');
const { scrapeProductDetail } = require('./src/lib/providers/detail.ts');
const fs = require('fs').promises;

const prisma = new PrismaClient();

// Load progress from file
async function loadProgress() {
  try {
    const data = await fs.readFile('alibaba-rescrape-progress.json', 'utf8');
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
    'alibaba-rescrape-progress.json',
    JSON.stringify(progress, null, 2)
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]) || 100;
  const batchSize = 5; // Small batches to avoid triggering anti-bot
  const delayMs = 10000; // 10 seconds between batches

  console.log('\n=== Fix Alibaba Images via Re-scraping ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Delay: ${delayMs}ms between batches`);
  console.log(`Limit: ${limit} listings\n`);

  // Load progress
  const progress = await loadProgress();
  console.log(`Resuming from: ${progress.lastProcessedId || 'beginning'}`);
  console.log(`Previous progress: ${progress.successCount} success, ${progress.failedCount} failed\n`);

  // Find Alibaba listings with /cache/ images
  const where = {
    platform: 'ALIBABA',
    image: { startsWith: '/cache/' },
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
      title: true,
    },
    take: limit,
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${listings.length} Alibaba listings to process\n`);

  if (dryRun) {
    console.log('=== DRY RUN PREVIEW (first 5) ===\n');
    for (let i = 0; i < Math.min(5, listings.length); i++) {
      const listing = listings[i];
      console.log(`${i + 1}. ${listing.title?.slice(0, 60) || listing.url.slice(0, 60)}...`);
      console.log(`   URL: ${listing.url}`);
      console.log(`   Current image: ${listing.image}`);
      console.log(`   Will re-scrape to get new heroImage\n`);
    }
    console.log(`Total to process: ${listings.length}`);
    console.log('\nRun without --dry-run to start processing');
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
        console.log(`  Scraping: ${listing.title?.slice(0, 50) || listing.url.slice(0, 50)}...`);
        
        // Use existing scraper infrastructure
        const detail = await scrapeProductDetail(listing.url, 'ALIBABA');
        
        if (!detail || !detail.heroImage) {
          console.log(`  ⚠️  No heroImage found`);
          failedCount++;
          continue;
        }

        // Update database with new image URL
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { 
            image: detail.heroImage,
            // Also update detailJson with fresh data
            detailJson: detail,
          },
        });

        console.log(`  ✅ Updated: ${detail.heroImage.slice(0, 70)}...`);
        successCount++;
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        failedCount++;
      }

      // Save progress after each listing
      progress.lastProcessedId = listing.id;
      progress.processedCount = successCount + failedCount;
      progress.successCount = successCount;
      progress.failedCount = failedCount;
      await saveProgress(progress);

      // Small delay between listings
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Delay between batches
    if (i + batchSize < listings.length) {
      console.log(`  💤 Waiting ${delayMs / 1000}s before next batch...`);
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
