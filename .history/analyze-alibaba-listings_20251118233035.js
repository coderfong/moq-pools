const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeListings() {
  console.log('=== RECENT ALIBABA LISTINGS (Last 5) ===\n');
  
  const recent = await prisma.savedListing.findMany({
    where: { source: 'alibaba' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      priceRaw: true,
      priceMin: true,
      priceMax: true,
      moqQty: true,
      createdAt: true,
      detailJson: true
    }
  });

  recent.forEach((l, i) => {
    console.log(`\n--- Recent Listing ${i + 1} ---`);
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('Created:', l.createdAt);
    console.log('Price Raw:', l.priceRaw);
    console.log('Price Min:', l.priceMin);
    console.log('Price Max:', l.priceMax);
    console.log('MOQ:', l.moqQty);
    
    if (l.detailJson) {
      const d = typeof l.detailJson === 'string' ? JSON.parse(l.detailJson) : l.detailJson;
      console.log('\nDETAIL JSON STRUCTURE:');
      console.log('  - attributes:', d.attributes ? d.attributes.length : 0);
      console.log('  - priceTiers:', d.priceTiers ? d.priceTiers.length : 0);
      console.log('  - imageUrls:', d.imageUrls ? d.imageUrls.length : 0);
      console.log('  - priceText:', d.priceText);
      console.log('  - moqText:', d.moqText);
      console.log('  - supplierName:', d.supplierName);
      console.log('  - supplierYears:', d.supplierYears);
      console.log('  - responseRate:', d.responseRate);
      
      if (d.attributes && d.attributes.length > 0) {
        console.log('\nATTRIBUTES:');
        d.attributes.forEach(a => console.log(`    ${a.label}: ${a.value}`));
      }
      
      if (d.priceTiers && d.priceTiers.length > 0) {
        console.log('\nPRICE TIERS:');
        d.priceTiers.forEach(t => console.log(`    ${t.range}: ${t.price}`));
      }
    } else {
      console.log('NO DETAIL JSON');
    }
  });

  console.log('\n\n=== OLD ALIBABA LISTINGS (Before Nov 10) ===\n');
  
  const old = await prisma.savedListing.findMany({
    where: {
      source: 'alibaba',
      createdAt: { lt: new Date('2025-11-10') }
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      priceRaw: true,
      priceMin: true,
      priceMax: true,
      moqQty: true,
      createdAt: true,
      detailJson: true
    }
  });

  old.forEach((l, i) => {
    console.log(`\n--- Old Listing ${i + 1} ---`);
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('Created:', l.createdAt);
    console.log('Price Raw:', l.priceRaw);
    console.log('Price Min:', l.priceMin);
    console.log('Price Max:', l.priceMax);
    console.log('MOQ:', l.moqQty);
    
    if (l.detailJson) {
      const d = typeof l.detailJson === 'string' ? JSON.parse(l.detailJson) : l.detailJson;
      console.log('\nDETAIL JSON STRUCTURE:');
      console.log('  - attributes:', d.attributes ? d.attributes.length : 0);
      console.log('  - priceTiers:', d.priceTiers ? d.priceTiers.length : 0);
      console.log('  - imageUrls:', d.imageUrls ? d.imageUrls.length : 0);
      console.log('  - priceText:', d.priceText);
      console.log('  - moqText:', d.moqText);
      console.log('  - supplierName:', d.supplierName);
      console.log('  - supplierYears:', d.supplierYears);
      console.log('  - responseRate:', d.responseRate);
      
      if (d.attributes && d.attributes.length > 0) {
        console.log('\nATTRIBUTES:');
        d.attributes.forEach(a => console.log(`    ${a.label}: ${a.value}`));
      }
      
      if (d.priceTiers && d.priceTiers.length > 0) {
        console.log('\nPRICE TIERS:');
        d.priceTiers.forEach(t => console.log(`    ${t.range}: ${t.price}`));
      }
    } else {
      console.log('NO DETAIL JSON');
    }
  });

  // Overall statistics
  console.log('\n\n=== OVERALL STATISTICS ===\n');
  
  const total = await prisma.savedListing.count({ where: { source: 'alibaba' } });
  console.log('Total Alibaba listings:', total);
  
  const withDetails = await prisma.savedListing.count({
    where: {
      source: 'alibaba',
      detailJson: { not: null }
    }
  });
  console.log('With detailJson:', withDetails);
  
  const withoutDetails = total - withDetails;
  console.log('Without detailJson:', withoutDetails);
  
  // Count by attribute length
  const allListings = await prisma.savedListing.findMany({
    where: { source: 'alibaba' },
    select: { detailJson: true }
  });
  
  let zeroAttrs = 0;
  let oneToFive = 0;
  let sixToTen = 0;
  let moreThanTen = 0;
  
  allListings.forEach(l => {
    if (!l.detailJson) {
      zeroAttrs++;
    } else {
      const d = typeof l.detailJson === 'string' ? JSON.parse(l.detailJson) : l.detailJson;
      const attrCount = d.attributes ? d.attributes.length : 0;
      if (attrCount === 0) zeroAttrs++;
      else if (attrCount <= 5) oneToFive++;
      else if (attrCount <= 10) sixToTen++;
      else moreThanTen++;
    }
  });
  
  console.log('\nAttribute distribution:');
  console.log('  0 attributes:', zeroAttrs);
  console.log('  1-5 attributes:', oneToFive);
  console.log('  6-10 attributes:', sixToTen);
  console.log('  >10 attributes:', moreThanTen);
  
  await prisma.$disconnect();
}

analyzeListings().catch(console.error);
