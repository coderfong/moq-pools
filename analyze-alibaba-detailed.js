const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeListings() {
  console.log('=== RECENT ALIBABA LISTINGS (Last 5) ===\n');
  
  const recent = await prisma.$queryRaw`
    SELECT id, title, "priceRaw", "priceMin", "priceMax", moq, "createdAt", "detailJson"
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  recent.forEach((l, i) => {
    console.log(`\n--- Recent Listing ${i + 1} ---`);
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('Created:', l.createdAt);
    console.log('Price Raw:', l.priceRaw);
    console.log('Price Min:', l.priceMin);
    console.log('Price Max:', l.priceMax);
    console.log('MOQ:', l.moq);
    
    if (l.detailJson) {
      const d = l.detailJson;
      console.log('\nDETAIL JSON STRUCTURE:');
      console.log('  - attributes:', d.attributes ? d.attributes.length : 0);
      console.log('  - priceTiers:', d.priceTiers ? d.priceTiers.length : 0);
      console.log('  - imageUrls:', d.imageUrls ? d.imageUrls.length : 0);
      console.log('  - priceText:', d.priceText);
      console.log('  - moqText:', d.moqText);
      console.log('  - supplierName:', d.supplierName);
      console.log('  - supplierYears:', d.supplierYears);
      console.log('  - responseRate:', d.responseRate);
      console.log('  - fullName:', d.fullName);
      
      if (d.attributes && d.attributes.length > 0) {
        console.log('\nATTRIBUTES:');
        d.attributes.forEach(a => console.log(`    ${a.label}: ${a.value}`));
      }
      
      if (d.priceTiers && d.priceTiers.length > 0) {
        console.log('\nPRICE TIERS:');
        d.priceTiers.forEach(t => console.log(`    ${t.range}: ${t.price}`));
      }
      
      console.log('\nFull detailJson size:', JSON.stringify(d).length, 'bytes');
    } else {
      console.log('NO DETAIL JSON');
    }
  });

  console.log('\n\n=== OLD ALIBABA LISTINGS (Before Nov 10) ===\n');
  
  const old = await prisma.$queryRaw`
    SELECT id, title, "priceRaw", "priceMin", "priceMax", moq, "createdAt", "detailJson"
    FROM "SavedListing"
    WHERE platform = 'ALIBABA' AND "createdAt" < '2025-11-10'
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;

  old.forEach((l, i) => {
    console.log(`\n--- Old Listing ${i + 1} ---`);
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('Created:', l.createdAt);
    console.log('Price Raw:', l.priceRaw);
    console.log('Price Min:', l.priceMin);
    console.log('Price Max:', l.priceMax);
    console.log('MOQ:', l.moq);
    
    if (l.detailJson) {
      const d = l.detailJson;
      console.log('\nDETAIL JSON STRUCTURE:');
      console.log('  - attributes:', d.attributes ? d.attributes.length : 0);
      console.log('  - priceTiers:', d.priceTiers ? d.priceTiers.length : 0);
      console.log('  - imageUrls:', d.imageUrls ? d.imageUrls.length : 0);
      console.log('  - priceText:', d.priceText);
      console.log('  - moqText:', d.moqText);
      console.log('  - supplierName:', d.supplierName);
      console.log('  - supplierYears:', d.supplierYears);
      console.log('  - responseRate:', d.responseRate);
      console.log('  - fullName:', d.fullName);
      
      if (d.attributes && d.attributes.length > 0) {
        console.log('\nATTRIBUTES:');
        d.attributes.forEach(a => console.log(`    ${a.label}: ${a.value}`));
      }
      
      if (d.priceTiers && d.priceTiers.length > 0) {
        console.log('\nPRICE TIERS:');
        d.priceTiers.forEach(t => console.log(`    ${t.range}: ${t.price}`));
      }
      
      console.log('\nFull detailJson size:', JSON.stringify(d).length, 'bytes');
    } else {
      console.log('NO DETAIL JSON');
    }
  });

  // Overall statistics
  console.log('\n\n=== OVERALL STATISTICS ===\n');
  
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT("detailJson") as "withDetails",
      COUNT(*) - COUNT("detailJson") as "withoutDetails"
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
  `;
  
  console.log('Total Alibaba listings:', Number(stats[0].total));
  console.log('With detailJson:', Number(stats[0].withDetails));
  console.log('Without detailJson:', Number(stats[0].withoutDetails));
  
  // Count by attribute length using raw SQL
  const attrStats = await prisma.$queryRaw`
    SELECT 
      CASE 
        WHEN "detailJson" IS NULL THEN 'no_json'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0 THEN 'zero_attrs'
        WHEN jsonb_array_length("detailJson"->'attributes') <= 5 THEN 'one_to_five'
        WHEN jsonb_array_length("detailJson"->'attributes') <= 10 THEN 'six_to_ten'
        ELSE 'more_than_ten'
      END as category,
      COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
    GROUP BY category
  `;
  
  console.log('\nAttribute distribution:');
  attrStats.forEach(s => {
    const label = {
      'no_json': 'No detailJson',
      'zero_attrs': '0 attributes',
      'one_to_five': '1-5 attributes',
      'six_to_ten': '6-10 attributes',
      'more_than_ten': '>10 attributes'
    }[s.category] || s.category;
    console.log(`  ${label}:`, Number(s.count));
  });
  
  await prisma.$disconnect();
}

analyzeListings().catch(console.error);
