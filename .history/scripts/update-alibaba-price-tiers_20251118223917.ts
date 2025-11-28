import { PrismaClient } from '@prisma/client';
import { fetchAlibabaPriceTiers, fetchAlibabaProductTitle } from '../src/lib/providers/alibaba';

const p = new PrismaClient();

async function main() {
  console.log('Starting Alibaba product data update (price tiers + titles)...\n');

  // Get all Alibaba listings - we'll filter for missing data after fetching
  const listings = await p.savedListing.findMany({
    where: {
      platform: 'ALIBABA',
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`Found ${listings.length} Alibaba listings total\n`);
  
  // Filter for listings that need updates
  // - Missing priceTiers OR
  // - Missing fullTitle in detailJson OR  
  // - Title seems truncated (very short or ends with ellipsis)
  const listingsToUpdate = listings.filter(listing => {
    const detail = (listing as any).detailJson;
    const hasPriceTiers = detail && detail.priceTiers && detail.priceTiers.length > 0;
    const hasFullTitle = detail && detail.fullTitle;
    const titleSeemsTruncated = !listing.title || listing.title.length < 50 || listing.title.endsWith('...');
    
    // Update if missing price tiers OR missing full title OR title seems truncated
    return !hasPriceTiers || !hasFullTitle || titleSeemsTruncated;
  });

  console.log(`${listingsToUpdate.length} listings need updates\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;
  const concurrency = 5;

  for (let i = 0; i < listingsToUpdate.length; i += batchSize) {
    const batch = listingsToUpdate.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(listingsToUpdate.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, listingsToUpdate.length)} of ${listingsToUpdate.length})`);

    // Process batch with concurrency limit
    const chunks: typeof batch[] = [];
    for (let j = 0; j < batch.length; j += concurrency) {
      chunks.push(batch.slice(j, j + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (listing) => {
          try {
            console.log(`  Fetching data for: ${listing.title?.substring(0, 50)}...`);
            
            // Fetch both price tiers and full title in parallel
            const [tiers, fullTitle] = await Promise.all([
              fetchAlibabaPriceTiers(listing.url),
              fetchAlibabaProductTitle(listing.url),
            ]);
            
            console.log(`    DEBUG: Got ${tiers.length} tiers, title: ${fullTitle ? fullTitle.substring(0, 40) + '...' : 'null'}`);
            
            if (tiers.length > 0 || fullTitle) {
              // Build update data
              const updateData: any = {};

              // Update detailJson with price tiers and full title
              if (tiers.length > 0 || fullTitle) {
                const existingDetail = (listing as any).detailJson || {};
                updateData.detailJson = {
                  ...existingDetail,
                  ...(tiers.length > 0 && { priceTiers: tiers }),
                  ...(fullTitle && { fullTitle }),
                };
              }

              // Also update the main title field if we got a better one
              if (fullTitle && fullTitle.length > (listing.title?.length || 0)) {
                updateData.title = fullTitle;
              }

              await p.savedListing.update({
                where: { id: listing.id },
                data: updateData,
              });
              
              const updates: string[] = [];
              if (tiers.length > 0) updates.push(`${tiers.length} price tiers`);
              if (fullTitle) updates.push(`full title (${fullTitle.length} chars)`);
              
              console.log(`    ✓ Updated with ${updates.join(', ')}`);
              updated++;
            } else {
              console.log(`    ⊘ No updates available (scraping returned nothing)`);
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
  console.log(`Skipped (no data): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${updated + skipped + errors}`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
