const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the scraping functions
const { fetchProductDetailCached } = require('./src/lib/providers/detail');

async function testFix() {
  console.log('=== TESTING SCRAPER WITH 3 LISTINGS ===\n');
  
  // Get 3 bad listings
  const listings = await prisma.$queryRaw`
    SELECT id, url, title
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
      )
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;
  
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n--- Test ${i + 1}/3 ---`);
    console.log(`Title: ${listing.title}`);
    console.log(`URL: ${listing.url}`);
    
    try {
      console.log('Scraping...');
      const detail = await fetchProductDetailCached(listing.url, true);
      
      if (!detail) {
        console.log('❌ No detail returned');
        continue;
      }
      
      const attrCount = detail.attributes ? detail.attributes.length : 0;
      const tierCount = detail.priceTiers ? detail.priceTiers.length : 0;
      
      console.log(`\nResults:`);
      console.log(`  Attributes: ${attrCount}`);
      console.log(`  Price Tiers: ${tierCount}`);
      console.log(`  Price Text: ${detail.priceText || 'N/A'}`);
      console.log(`  MOQ Text: ${detail.moqText || 'N/A'}`);
      console.log(`  Full Name: ${detail.fullName || 'N/A'}`);
      console.log(`  Supplier: ${detail.supplierName || 'N/A'}`);
      console.log(`  Debug Source: ${detail.debugSource || 'normal scrape'}`);
      
      if (detail.attributes && detail.attributes.length > 0) {
        console.log(`\nFirst 5 attributes:`);
        detail.attributes.slice(0, 5).forEach(a => {
          console.log(`    ${a.label}: ${a.value}`);
        });
      }
      
      if (attrCount >= 10) {
        console.log(`\n✅ SUCCESS: Good quality data!`);
      } else if (attrCount > 0) {
        console.log(`\n⚠️  PARTIAL: Some data but not complete`);
      } else {
        console.log(`\n❌ FAILED: No attributes (fallback data)`);
      }
      
      // Wait between requests
      if (i < listings.length - 1) {
        console.log('\nWaiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      console.log(error.stack);
    }
  }
  
  await prisma.$disconnect();
  console.log('\n\n=== TEST COMPLETE ===');
}

testFix().catch(console.error);
