import { prisma } from '../src/lib/prisma';
import { fetchProductDetail } from '../src/lib/providers/detail';

/**
 * Batch fix Made-in-China listings with broken titles
 * Processes multiple batches automatically
 */
async function batchFixMadeInChinaTitles() {
  const batchSize = 50;
  const maxBatches = 20; // Process up to 1000 listings per run (20 * 50)
  const delayBetweenBatches = 5000; // 5 seconds between batches
  
  let totalFixed = 0;
  let totalFailed = 0;
  let batchCount = 0;

  console.log(`🔧 Batch fixing Made-in-China titles...\n`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Max batches: ${maxBatches}`);
  console.log(`Delay between batches: ${delayBetweenBatches}ms\n`);

  for (let i = 0; i < maxBatches; i++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`BATCH ${i + 1}/${maxBatches}`);
    console.log('='.repeat(80));

    // Get all listings and filter for broken titles
    const allListings = await prisma!.savedListing.findMany({
      where: {
        url: { contains: 'made-in-china.com' },
      },
      select: {
        id: true,
        url: true,
        title: true,
        priceRaw: true,
        image: true,
      },
    });

    const brokenPattern = /^\d+\s*\/\s*\d+$/;
    const brokenListings = allListings
      .filter(listing => brokenPattern.test(listing.title))
      .slice(0, batchSize);

    if (brokenListings.length === 0) {
      console.log('\n✅ No more broken titles found!');
      break;
    }

    console.log(`\nFound ${brokenListings.length} broken titles in this batch`);

    let fixed = 0;
    let failed = 0;

    for (const listing of brokenListings) {
      try {
        const detail = await fetchProductDetail(listing.url);

        if (detail && detail.title && !detail.title.match(/^\d+\s*\/\s*\d+/)) {
          await prisma!.savedListing.update({
            where: { id: listing.id },
            data: {
              title: detail.title,
              priceRaw: detail.priceText || listing.priceRaw || null,
              image: detail.heroImage || listing.image,
            },
          });

          console.log(`✅ ${fixed + 1}/${brokenListings.length}: ${detail.title.substring(0, 80)}`);
          fixed++;
        } else {
          console.log(`⚠️  ${fixed + failed + 1}/${brokenListings.length}: Could not extract title`);
          failed++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error: any) {
        console.error(`❌ ${fixed + failed + 1}/${brokenListings.length}: ${error.message}`);
        failed++;
      }
    }

    totalFixed += fixed;
    totalFailed += failed;
    batchCount++;

    console.log(`\nBatch ${i + 1} Summary: ${fixed} fixed, ${failed} failed`);

    // Delay between batches (except after the last one)
    if (i < maxBatches - 1 && brokenListings.length > 0) {
      console.log(`\nWaiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`FINAL SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Total batches processed: ${batchCount}`);
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`Total processed: ${totalFixed + totalFailed}`);

  // Check remaining
  const allListings = await prisma!.savedListing.findMany({
    where: { url: { contains: 'made-in-china.com' } },
    select: { title: true },
  });
  const brokenPattern = /^\d+\s*\/\s*\d+$/;
  const remaining = allListings.filter(l => brokenPattern.test(l.title)).length;
  
  console.log(`\nRemaining broken titles: ${remaining}`);
  if (remaining > 0) {
    console.log(`Run this script again to process more.`);
  } else {
    console.log(`\n🎉 All titles fixed!`);
  }
}

batchFixMadeInChinaTitles()
  .catch(console.error)
  .finally(() => prisma?.$disconnect());
