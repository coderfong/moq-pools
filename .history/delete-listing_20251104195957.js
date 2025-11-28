const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteListing() {
  const id = 'cmfyzwcse0003kek8808rfb66';
  
  try {
    // Get all pools for this product
    const pools = await prisma.pool.findMany({
      where: { productId: id },
      select: { id: true }
    });
    
    console.log(`Found ${pools.length} pools to delete`);
    
    // Delete in proper order: payments -> pool items -> pools -> product
    for (const pool of pools) {
      // Get pool items
      const poolItems = await prisma.poolItem.findMany({
        where: { poolId: pool.id },
        select: { id: true }
      });
      
      // Delete payments for each pool item
      for (const item of poolItems) {
        await prisma.payment.deleteMany({
          where: { poolItemId: item.id }
        });
      }
      
      // Delete pool items
      const deletedItems = await prisma.poolItem.deleteMany({
        where: { poolId: pool.id }
      });
      console.log(`  🗑️  Deleted ${deletedItems.count} items from pool ${pool.id}`);
    }
    
    // Then delete pools
    const deletedPools = await prisma.pool.deleteMany({
      where: { productId: id }
    });
    console.log(`🗑️  Deleted ${deletedPools.count} pools`);
    
    // Finally delete the product
    await prisma.product.delete({
      where: { id }
    });
    console.log('✅ Deleted listing: Photocard Sleeves (100 pcs)\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteListing()
  .finally(() => prisma.$disconnect());
