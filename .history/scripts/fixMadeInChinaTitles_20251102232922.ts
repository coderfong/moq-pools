import { prisma } from '../src/lib/prisma';
import { fetchProductDetail } from '../src/lib/providers/detail';

/**
 * Fix Made-in-China listings that have "1/ X" titles by re-scraping detail pages
 */
async function fixMadeInChinaTitles() {
  console.log('Finding Made-in-China listings with broken titles...\n');

  const brokenListings = await prisma!.savedListing.findMany({
    where: {
      AND: [
        { url: { contains: 'made-in-china.com' } },
        { OR: [
          { title: { startsWith: '1/' } },
          { title: { startsWith: '2/' } },
          { title: { startsWith: '3/' } },
          { title: { startsWith: '4/' } },
          { title: { startsWith: '5/' } },
          { title: { contains: '/' } }, // Catch other "X/ Y" patterns
        ]}
      ]
    },
    select: {
      id: true,
      url: true,
      title: true,
      priceRaw: true,
      image: true,
    },
    take: 50, // Process in batches
  });

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
  .finally(() => prisma.$disconnect());
