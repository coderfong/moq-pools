const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPoolItems() {
  console.log('Checking pool items and their products...\n');
  
  // Get pools with their products
  const pools = await prisma.pool.findMany({
    include: {
      product: true,
      items: {
        include: {
          user: { select: { email: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log(`Total pools found: ${pools.length}\n`);
  
  if (pools.length === 0) {
    console.log('❌ No pools found!');
    console.log('You need to create pools for products first.\n');
  } else {
    // Calculate progress and sort
    const sorted = pools.map(pool => ({
      ...pool,
      progress: pool.pledgedQty / pool.targetQty
    })).sort((a, b) => b.progress - a.progress);
    
    console.log('=== Pools sorted by progress (highest first) ===\n');
    
    sorted.forEach((pool, i) => {
      const progressPct = (pool.progress * 100).toFixed(1);
      console.log(`${i+1}. ${pool.product.title?.substring(0, 80)}`);
      console.log(`   Progress: ${progressPct}% (${pool.pledgedQty}/${pool.targetQty} units)`);
      console.log(`   Product ID: ${pool.productId}`);
      console.log(`   Pool ID: ${pool.id}`);
      console.log(`   Status: ${pool.status}`);
      console.log(`   Platform: ${pool.product.sourcePlatform}`);
      console.log(`   Pool Items: ${pool.items.length}`);
      console.log('');
    });
    
    console.log('\n=== Top 5 pools by progress ===\n');
    sorted.slice(0, 5).forEach((pool, i) => {
      const progressPct = (pool.progress * 100).toFixed(1);
      console.log(`${i+1}. ${progressPct}% - ${pool.product.title?.substring(0, 80)}`);
      console.log(`   ${pool.pledgedQty}/${pool.targetQty} units`);
    });
    
    // Check if products are active and have sourceUrl
    console.log('\n=== Checking why products might not show ===\n');
    sorted.slice(0, 5).forEach((pool) => {
      console.log(`Product: ${pool.product.title?.substring(0, 60)}`);
      console.log(`  isActive: ${pool.product.isActive}`);
      console.log(`  sourceUrl: ${pool.product.sourceUrl ? 'YES' : '❌ NO (filtered out!)'}`);
      console.log(`  moqQty: ${pool.product.moqQty}`);
      console.log(`  sourcePlatform: ${pool.product.sourcePlatform}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkPoolItems().catch(console.error);
