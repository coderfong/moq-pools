const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPoolProducts() {
  console.log('Checking products with pools...\n');
  
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      NOT: [{ sourceUrl: null }],
      pool: { isNot: null }
    },
    include: { pool: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total products with pools found: ${products.length}\n`);
  
  if (products.length === 0) {
    console.log('❌ No products with pools found!');
    console.log('This is why they are not showing on the browse page.\n');
  } else {
    products.forEach((prod, i) => {
      const progress = prod.pool ? ((prod.pool.pledgedQty / prod.pool.targetQty) * 100).toFixed(1) : 0;
      const pledged = prod.pool?.pledgedQty || 0;
      const target = prod.pool?.targetQty || 0;
      console.log(`${i+1}. ${prod.title?.substring(0, 80)}`);
      console.log(`   Progress: ${progress}% (${pledged}/${target} units)`);
      console.log(`   ID: ${prod.id}`);
      console.log(`   Platform: ${prod.sourcePlatform}`);
      console.log('');
    });
    
    // Sort by progress
    const sorted = products.sort((a, b) => {
      const ap = a.pool ? (a.pool.pledgedQty / a.pool.targetQty) : -1;
      const bp = b.pool ? (b.pool.pledgedQty / b.pool.targetQty) : -1;
      return bp - ap;
    });
    
    console.log('\n=== Top 5 by Pool Progress ===\n');
    sorted.slice(0, 5).forEach((prod, i) => {
      const progress = prod.pool ? ((prod.pool.pledgedQty / prod.pool.targetQty) * 100).toFixed(1) : 0;
      console.log(`${i+1}. ${prod.title?.substring(0, 80)} - ${progress}%`);
    });
  }
  
  await prisma.$disconnect();
}

checkPoolProducts().catch(console.error);
