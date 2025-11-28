const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// SAFE VERSION - PREVIEW ONLY, NEVER DELETES
async function previewLargeItems() {
  console.log('👀 SAFE PREVIEW: Large items analysis (NO DELETIONS)\n');

  const EXCLUDED_KEYWORDS = [
    'car', 'truck', 'vehicle', 'motorcycle', 'excavator', 'bulldozer',
    'forklift', 'tractor', 'sofa', 'couch', 'bed', 'mattress', 
    'washing machine', 'refrigerator', 'concrete', 'lumber'
  ];

  try {
    const allListings = await prisma.savedListing.findMany({
      select: {
        id: true,
        title: true,
        platform: true
      }
    });

    console.log(`📊 Total listings: ${allListings.length}`);

    const flagged = [];
    
    for (const listing of allListings) {
      const text = (listing.title || '').toLowerCase();
      const shouldFlag = EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
      
      if (shouldFlag) {
        flagged.push(listing);
      }
    }

    console.log(`\n🔍 Found ${flagged.length} large items (${((flagged.length / allListings.length) * 100).toFixed(1)}%)`);
    console.log(`\n📋 Sample large items (showing first 10):`);
    
    flagged.slice(0, 10).forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.platform}] ${item.title?.substring(0, 80)}...`);
    });

    console.log('\n✅ PREVIEW COMPLETE - No items were deleted');
    console.log('💡 This is a safe analysis only');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

previewLargeItems().catch(console.error);