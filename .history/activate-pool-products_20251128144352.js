const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activatePoolProducts() {
  console.log('Activating products with pools...\n');
  
  // Find all products that have pools but are inactive
  const pools = await prisma.pool.findMany({
    include: { product: true }
  });
  
  const inactiveProductsWithPools = pools.filter(p => !p.product.isActive);
  
  console.log(`Found ${inactiveProductsWithPools.length} inactive products with pools\n`);
  
  if (inactiveProductsWithPools.length === 0) {
    console.log('✅ All products with pools are already active!');
  } else {
    for (const pool of inactiveProductsWithPools) {
      console.log(`Activating: ${pool.product.title?.substring(0, 70)}`);
      console.log(`  Product ID: ${pool.productId}`);
      console.log(`  Pool progress: ${pool.pledgedQty}/${pool.targetQty}`);
      
      await prisma.product.update({
        where: { id: pool.productId },
        data: { isActive: true }
      });
      
      console.log(`  ✅ Activated!\n`);
    }
    
    console.log(`\n✅ Activated ${inactiveProductsWithPools.length} products with pools!`);
    console.log('They should now appear on the browse page.\n');
  }
  
  await prisma.$disconnect();
}

activatePoolProducts().catch(console.error);
