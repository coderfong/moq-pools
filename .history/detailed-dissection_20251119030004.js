const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedDissection() {
  console.log('=== DETAILED DISSECTION OF ALIBABA LISTINGS ===\n');
  
  // Get examples of GOOD listings (>10 attributes)
  console.log('--- GOOD LISTINGS (>10 attributes) ---\n');
  const good = await prisma.$queryRaw`
    SELECT id, title, "priceRaw", "createdAt", 
           jsonb_array_length("detailJson"->'attributes') as attr_count,
           jsonb_array_length(COALESCE("detailJson"->'priceTiers', '[]'::jsonb)) as tier_count,
           length("detailJson"::text) as json_size,
           "detailJson"
    FROM "SavedListing"
    WHERE platform = 'ALIBABA' 
      AND jsonb_array_length("detailJson"->'attributes') > 10
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;
  
  good.forEach((l, i) => {
    console.log(`\nGood Listing ${i + 1}:`);
    console.log(`ID: ${l.id}`);
    console.log(`Title: ${l.title}`);
    console.log(`Created: ${l.createdAt}`);
    console.log(`Price: ${l.priceRaw}`);
    console.log(`Attributes: ${l.attr_count}`);
    console.log(`Price Tiers: ${l.tier_count}`);
    console.log(`JSON Size: ${l.json_size} bytes`);
    
    const d = l.detailJson;
    console.log(`\nFull Product Details:`);
    console.log(`  Full Name: ${d.fullName || 'N/A'}`);
    console.log(`  Price Text: ${d.priceText || 'N/A'}`);
    console.log(`  MOQ Text: ${d.moqText || 'N/A'}`);
    console.log(`  Supplier: ${d.supplierName || 'N/A'}`);
    console.log(`  Supplier Years: ${d.supplierYears || 'N/A'}`);
    console.log(`  Response Rate: ${d.responseRate || 'N/A'}`);
    console.log(`  Images: ${d.imageUrls ? d.imageUrls.length : 0}`);
    
    console.log(`\nAll Attributes:`);
    if (d.attributes) {
      d.attributes.forEach(a => console.log(`    • ${a.label}: ${a.value}`));
    }
    
    console.log(`\nAll Price Tiers:`);
    if (d.priceTiers) {
      d.priceTiers.forEach(t => console.log(`    • ${t.range}: ${t.price}`));
    }
    
    console.log('\n' + '='.repeat(80));
  });
  
  // Get examples of BAD listings (0 attributes)
  console.log('\n\n--- BAD LISTINGS (0 attributes) ---\n');
  const bad = await prisma.$queryRaw`
    SELECT id, title, "priceRaw", "createdAt",
           "detailJson"
    FROM "SavedListing"
    WHERE platform = 'ALIBABA' 
      AND "detailJson" IS NOT NULL
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;
  
  bad.forEach((l, i) => {
    console.log(`\nBad Listing ${i + 1}:`);
    console.log(`ID: ${l.id}`);
    console.log(`Title: ${l.title}`);
    console.log(`Created: ${l.createdAt}`);
    console.log(`Price: ${l.priceRaw}`);
    
    const d = l.detailJson;
    console.log(`\nWhat's in detailJson:`);
    console.log(`  Full Name: ${d.fullName || 'N/A'}`);
    console.log(`  Price Text: ${d.priceText || 'N/A'}`);
    console.log(`  MOQ Text: ${d.moqText || 'N/A'}`);
    console.log(`  Supplier: ${d.supplierName || 'N/A'}`);
    console.log(`  Attributes: ${d.attributes ? d.attributes.length : 0}`);
    console.log(`  Price Tiers: ${d.priceTiers ? d.priceTiers.length : 0}`);
    console.log(`  Images: ${d.imageUrls ? d.imageUrls.length : 0}`);
    
    console.log(`\nFull JSON content:`);
    console.log(JSON.stringify(d, null, 2));
    console.log('\n' + '='.repeat(80));
  });
  
  // Get examples of NO JSON
  console.log('\n\n--- NO DETAIL JSON ---\n');
  const noJson = await prisma.$queryRaw`
    SELECT id, title, "priceRaw", "createdAt", url
    FROM "SavedListing"
    WHERE platform = 'ALIBABA' 
      AND "detailJson" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;
  
  noJson.forEach((l, i) => {
    console.log(`\nNo JSON Listing ${i + 1}:`);
    console.log(`ID: ${l.id}`);
    console.log(`Title: ${l.title}`);
    console.log(`Created: ${l.createdAt}`);
    console.log(`Price: ${l.priceRaw}`);
    console.log(`URL: ${l.url}`);
    console.log('='.repeat(80));
  });
  
  // Timeline analysis
  console.log('\n\n=== TIMELINE ANALYSIS ===\n');
  const timeline = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as total,
      COUNT("detailJson") as "withJson",
      SUM(CASE WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) > 10 THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0 THEN 1 ELSE 0 END) as bad
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
    LIMIT 20
  `;
  
  console.log('Date       | Total | With JSON | Good (>10 attr) | Bad (0 attr)');
  console.log('-'.repeat(70));
  timeline.forEach(t => {
    console.log(`${t.date.toISOString().split('T')[0]} | ${String(t.total).padStart(5)} | ${String(t.withJson).padStart(9)} | ${String(t.good).padStart(15)} | ${String(t.bad).padStart(12)}`);
  });
  
  await prisma.$disconnect();
}

detailedDissection().catch(console.error);
