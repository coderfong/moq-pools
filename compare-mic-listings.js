const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareListings() {
  console.log('=== COMPARING GOOD vs BAD MIC LISTINGS ===\n');
  
  // Get good listings (with attributes)
  console.log('✅ GOOD LISTINGS (with attributes):\n');
  const goodListings = await prisma.$queryRaw`
    SELECT 
      id,
      title,
      url,
      jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) as attr_count,
      "detailJson"
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
    LIMIT 5
  `;
  
  goodListings.forEach((listing, i) => {
    console.log(`${i + 1}. ${listing.title}`);
    console.log(`   URL: ${listing.url}`);
    console.log(`   Attributes: ${listing.attr_count}`);
    
    if (listing.detailJson) {
      const detail = listing.detailJson;
      
      console.log(`   DetailJson keys: ${Object.keys(detail).join(', ')}`);
      
      if (detail.attributes && detail.attributes.length > 0) {
        console.log(`   First 5 attributes:`);
        detail.attributes.slice(0, 5).forEach(attr => {
          console.log(`     • ${JSON.stringify(attr)}`);
        });
      }
      
      if (detail.priceTiers) {
        console.log(`   Price tiers: ${detail.priceTiers.length}`);
      }
      
      if (detail.supplier) {
        console.log(`   Supplier: ${detail.supplier.name || 'N/A'}`);
      }
    }
    console.log('');
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Get bad listings (no detailJson)
  console.log('❌ BAD LISTINGS (no detailJson):\n');
  const badListings = await prisma.$queryRaw`
    SELECT 
      id,
      title,
      url,
      "detailJson"
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND "detailJson" IS NULL
    LIMIT 5
  `;
  
  badListings.forEach((listing, i) => {
    console.log(`${i + 1}. ${listing.title}`);
    console.log(`   URL: ${listing.url}`);
    console.log(`   DetailJson: ${listing.detailJson === null ? 'NULL' : 'EXISTS'}`);
    console.log('');
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Get sample of listings with partial data
  console.log('⚠️  PARTIAL LISTINGS (has detailJson but few/no attributes):\n');
  const partialListings = await prisma.$queryRaw`
    SELECT 
      id,
      title,
      url,
      jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) as attr_count,
      "detailJson"
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND "detailJson" IS NOT NULL
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
    LIMIT 5
  `;
  
  if (partialListings.length > 0) {
    partialListings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title}`);
      console.log(`   URL: ${listing.url}`);
      console.log(`   Attributes: ${listing.attr_count || 0}`);
      
      if (listing.detailJson) {
        console.log(`   DetailJson keys: ${Object.keys(listing.detailJson).join(', ')}`);
        console.log(`   Full detailJson: ${JSON.stringify(listing.detailJson, null, 2)}`);
      }
      console.log('');
    });
  } else {
    console.log('   (None found - all listings either have 0 attributes or 10+)\n');
  }
  
  await prisma.$disconnect();
}

compareListings().catch(console.error);
