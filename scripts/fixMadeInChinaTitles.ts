import { prisma } from '../src/lib/prisma';
import { fetchProductDetail } from '../src/lib/providers/detail';

/**
 * Fix Made-in-China listings that have "1/ X" titles by re-scraping detail pages
 */
async function fixMadeInChinaTitles() {
  console.log('Finding Made-in-China listings with broken titles...\n');

  // Get all Made-in-China listings and filter in JavaScript
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

  // Filter for broken titles (exact "1/ 6" pattern)
  const brokenPattern = /^\d+\s*\/\s*\d+$/;
  const brokenListings = allListings.filter(listing => brokenPattern.test(listing.title)).slice(0, 50);

  console.log(`Found ${brokenListings.length} listings with broken titles\n`);

  if (brokenListings.length === 0) {
    console.log('No broken titles found! ✅');
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (const listing of brokenListings) {
    console.log(`\nProcessing: ${listing.title}`);
    console.log(`URL: ${listing.url}`);

    try {
      // Re-scrape the detail page
      const detail = await fetchProductDetail(listing.url);

      if (detail && detail.title && !detail.title.match(/^\d+\s*\/\s*\d+/)) {
        // Update the listing with correct data
        await prisma!.savedListing.update({
          where: { id: listing.id },
          data: {
            title: detail.title,
            priceRaw: detail.priceText || listing.priceRaw || null,
            image: detail.heroImage || listing.image,
          },
        });

        console.log(`✅ Fixed: "${detail.title}"`);
        fixed++;
      } else {
        console.log(`⚠️  Could not extract proper title, skipping...`);
        failed++;
      }

      // Be nice to the server
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
      failed++;
    }
  }

  console.log(`\n\n=== Summary ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total processed: ${brokenListings.length}`);
}

fixMadeInChinaTitles()
  .catch(console.error)
  .finally(() => prisma?.$disconnect());
