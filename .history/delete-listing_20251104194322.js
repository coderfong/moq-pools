const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteListing() {
  const id = 'cmfyzwcse0003kek8808rfb66';
  
  try {
    // First delete associated pools
    const deletedPools = await prisma.pool.deleteMany({
      where: { productId: id }
    });
    console.log(`🗑️  Deleted ${deletedPools.count} associated pools`);
    
    // Then delete the product
    await prisma.product.delete({
      where: { id }
    });
    console.log('✅ Deleted listing: Photocard Sleeves (100 pcs)');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteListing()
  .finally(() => prisma.$disconnect());
