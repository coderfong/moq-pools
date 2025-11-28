const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOne() {
  console.log('=== TESTING RE-SCRAPE API ===\n');
  
  // Get one bad listing
  const listing = await prisma.$queryRaw`
    SELECT id, title, url
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
      )
    LIMIT 1
  `;
  
  if (listing.length === 0) {
    console.log('No bad listings found to test!');
    await prisma.$disconnect();
    return;
  }
  
  const test = listing[0];
  console.log(`Testing with: ${test.title}`);
  console.log(`URL: ${test.url}\n`);
  
  try {
    console.log('Calling API...');
    const response = await fetch('http://localhost:3007/api/rescrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: test.id })
    });
    
    console.log(`HTTP Status: ${response.status}\n`);
    
    const result = await response.json();
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`\n✅ SUCCESS!`);
      console.log(`Quality: ${result.quality}`);
      console.log(`Attributes: ${result.attributes}`);
      console.log(`Price Tiers: ${result.priceTiers}`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(error.stack);
  }
  
  await prisma.$disconnect();
}

testOne().catch(console.error);
