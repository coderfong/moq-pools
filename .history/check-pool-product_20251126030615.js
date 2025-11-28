const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkPoolProduct() {
  console.log('\n=== Checking Pool Product Linkage ===\n');
  
  const pool = await prisma.pool.findUnique({
    where: { id: 'cmievzk5o000p9ehvx0p4abgt' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sourceUrl: true
        }
      }
    }
  });
  
  console.log('Pool cmievzk5o000p9ehvx0p4abgt:');
  console.log('  Product ID:', pool.product.id);
  console.log('  Product Name:', pool.product.name);
  console.log('  Source URL:', pool.product.sourceUrl);
  console.log('  Pledged Qty:', pool.pledgedQty);
  console.log('  Target Qty:', pool.targetQty);
  
  console.log('\n=== Checking which listing this should match ===\n');
  
  // The listing user purchased from
  const targetListing = await prisma.savedListing.findUnique({
    where: { id: 'cmg15besl07gerdvrqdo18ucp' }
  });
  
  console.log('Target Listing (user purchased from):');
  console.log('  ID:', targetListing.id);
  console.log('  Title:', targetListing.title);
  console.log('  URL:', targetListing.url);
  
  console.log('\n=== Checking if URLs match ===\n');
  console.log('Pool Product sourceUrl:', pool.product.sourceUrl);
  console.log('Target Listing URL:', targetListing.url);
  console.log('Match?', pool.product.sourceUrl === targetListing.url);
  
  console.log('\n=== Checking for other products with this listing URL ===\n');
  
  const productsWithSameUrl = await prisma.product.findMany({
    where: {
      sourceUrl: targetListing.url
    },
    select: {
      id: true,
      name: true,
      sourceUrl: true,
      pool: {
        select: {
          id: true,
          pledgedQty: true,
          targetQty: true
        }
      }
    }
  });
  
  console.log(`Found ${productsWithSameUrl.length} product(s) with URL ${targetListing.url}:`);
  productsWithSameUrl.forEach(p => {
    console.log(`  - Product ${p.id}: ${p.name}`);
    if (p.pool) {
      console.log(`    Pool ${p.pool.id}: ${p.pool.pledgedQty}/${p.pool.targetQty}`);
    }
  });
  
  await prisma.$disconnect();
}

checkPoolProduct().catch(console.error);
