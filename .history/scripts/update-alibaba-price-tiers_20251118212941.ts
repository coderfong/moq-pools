import { PrismaClient } from '@prisma/client';
import { fetchAlibabaPriceTiers } from '../src/lib/providers/alibaba';

const p = new PrismaClient();

async function main() {
  console.log('Starting Alibaba price tier update...\n');

  // Get all Alibaba listings without price tiers
  const listings = await p.savedListing.findMany({
    where: {
      platform: 'ALIBABA',
      OR: [
        { detailJson: null },
        { detailJson: { equals: {} } },
      ]
    },
    select: {
      id: true,
      url: true,
      title: true,
      detailJson: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`Found ${listings.length} Alibaba listings to update\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;
  const concurrency = 5;

  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(listings.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, listings.length)} of ${listings.length})`);

    // Process batch with concurrency limit
    const chunks: typeof batch[] = [];
    for (let j = 0; j < batch.length; j += concurrency) {
      chunks.push(batch.slice(j, j + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (listing) => {
          try {
            console.log(`  Fetching tiers for: ${listing.title?.substring(0, 50)}...`);
            
            const tiers = await fetchAlibabaPriceTiers(listing.url);
            
            if (tiers.length > 0) {
              // Update detailJson with price tiers
              const existingDetail = (listing.detailJson as any) || {};
              await p.savedListing.update({
                where: { id: listing.id },
                data: {
                  detailJson: {
                    ...existingDetail,
                    priceTiers: tiers,
                  },
                  detailUpdatedAt: new Date(),
                },
              });
              
              console.log(`    ✓ Updated with ${tiers.length} price tiers`);
              updated++;
            } else {
              console.log(`    ⊘ No price tiers found`);
              skipped++;
            }
          } catch (err: any) {
            console.error(`    ✗ Error:`, err.message);
            errors++;
          }
        })
      );

      // Small delay between chunks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Update complete!');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no tiers): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${updated + skipped + errors}`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
