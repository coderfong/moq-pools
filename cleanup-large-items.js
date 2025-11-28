const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Items that are too large/expensive to ship
const EXCLUDED_KEYWORDS = [
  // Vehicles
  'car', 'truck', 'vehicle', 'motorcycle', 'atv', 'boat', 'yacht',
  'trailer', 'rv', 'camper', 'bus', 'van', 'automobile', 'auto',
  
  // Heavy machinery
  'excavator', 'bulldozer', 'crane', 'forklift', 'tractor',
  'combine', 'harvester', 'compactor', 'loader', 'backhoe',
  'generator', 'compressor', 'welder', 'lathe', 'mill',
  
  // Large furniture
  'sofa', 'couch', 'sectional', 'recliner', 'bed', 'mattress', 
  'wardrobe', 'armoire', 'cabinet', 'bookshelf', 'entertainment center',
  'dining table', 'conference table', 'desk', 'workstation',
  
  // Large appliances  
  'washing machine', 'washer', 'dryer', 'refrigerator', 'freezer',
  'dishwasher', 'oven', 'stove', 'range', 'cooktop',
  
  // Construction materials (bulk)
  'concrete', 'cement', 'lumber', 'steel beam', 'rebar',
  'roofing material', 'insulation', 'drywall', 'tile pallet',
  
  // HVAC (large units)
  'air conditioner', 'furnace', 'heat pump', 'boiler',
  'industrial fan', 'ventilation system'
];

async function cleanupLargeItems() {
  console.log('🚛 Cleaning up items that are too large to ship...\n');

  try {
    // Count total listings
    const totalListings = await prisma.savedListing.count();
    console.log(`📊 Total listings in database: ${totalListings}`);

    let removedCount = 0;
    let checkedCount = 0;
    const batchSize = 100;

    // Process in batches
    for (let offset = 0; offset < totalListings; offset += batchSize) {
      const listings = await prisma.savedListing.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          platform: true
        },
        skip: offset,
        take: batchSize
      });

      console.log(`\n🔍 Checking batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalListings / batchSize)} (${listings.length} items)`);

      const toRemove = [];

      for (const listing of listings) {
        checkedCount++;
        const text = ((listing.title || '') + ' ' + (listing.description || '')).toLowerCase();
        
        // Check if contains excluded keywords
        const shouldExclude = EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
        
        if (shouldExclude) {
          toRemove.push(listing.id);
          console.log(`  ❌ ${listing.title?.substring(0, 60)}...`);
        }
      }

      // Remove listings in this batch
      if (toRemove.length > 0) {
        await prisma.savedListing.deleteMany({
          where: {
            id: {
              in: toRemove
            }
          }
        });
        removedCount += toRemove.length;
        console.log(`  🗑️  Removed ${toRemove.length} large items from this batch`);
      } else {
        console.log(`  ✅ No large items found in this batch`);
      }

      // Progress update
      console.log(`  📈 Progress: ${checkedCount}/${totalListings} checked, ${removedCount} removed total`);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Cleanup completed!');
    console.log(`📊 Final stats:`);
    console.log(`  📦 Total checked: ${checkedCount}`);
    console.log(`  ❌ Removed (too large): ${removedCount}`);
    console.log(`  ✅ Remaining: ${totalListings - removedCount}`);
    console.log(`  💰 Removal rate: ${((removedCount / totalListings) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Show what would be removed (dry run)
async function previewCleanup() {
  console.log('👀 PREVIEW: Items that would be removed (dry run)\n');

  try {
    const allListings = await prisma.savedListing.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        platform: true
      }
    });

    console.log(`📊 Total listings: ${allListings.length}`);

    const toRemove = [];
    const samples = [];

    for (const listing of allListings) {
      const text = ((listing.title || '') + ' ' + (listing.description || '')).toLowerCase();
      
      const shouldExclude = EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
      
      if (shouldExclude) {
        toRemove.push(listing.id);
        if (samples.length < 20) { // Show first 20 examples
          samples.push({
            title: listing.title,
            platform: listing.platform
          });
        }
      }
    }

    console.log(`\n📋 Would remove ${toRemove.length} items (${((toRemove.length / allListings.length) * 100).toFixed(1)}%)`);
    console.log(`\n🔍 Sample items that would be removed:`);
    
    samples.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.platform}] ${item.title?.substring(0, 80)}...`);
    });

    console.log('\n💡 To actually remove these items, run: node cleanup-large-items.js --confirm');

  } catch (error) {
    console.error('❌ Error during preview:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const shouldConfirm = process.argv.includes('--confirm');
const shouldPreview = process.argv.includes('--preview') || !shouldConfirm;

if (shouldPreview) {
  previewCleanup().catch(console.error);
} else {
  cleanupLargeItems().catch(console.error);
}