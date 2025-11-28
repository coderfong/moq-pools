const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function findAndRemoveDuplicate() {
  console.log('\n=== Finding System-Created Duplicates ===\n');
  
  // Find products with "System" supplier and matching the camera title
  const systemProducts = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: 'Polar Camera 24 Hours' } },
        { title: { contains: '360 Degree Panoramic Solar' } }
      ]
    },
    include: {
      supplier: {
        select: { name: true }
      },
      pool: {
        select: {
          id: true,
          pledgedQty: true,
          targetQty: true
        }
      }
    }
  });
  
  console.log(`Found ${systemProducts.length} matching products:\n`);
  
  for (const product of systemProducts) {
    console.log(`Product ID: ${product.id}`);
    console.log('  Title:', product.title);
    console.log('  Supplier:', product.supplier?.name || 'N/A');
    console.log('  SourceUrl:', product.sourceUrl);
    console.log('  IsActive:', product.isActive);
    if (product.pool) {
      console.log('  Pool:', `${product.pool.pledgedQty}/${product.pool.targetQty}`);
    }
    console.log();
    
    // Set to inactive (don't delete in case pool has data)
    if (product.supplier?.name === 'System') {
      console.log(`  ⚠️  Setting to inactive...`);
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false }
      });
      console.log('  ✅ Set to inactive\n');
    }
  }
  
  await prisma.$disconnect();
}

findAndRemoveDuplicate().catch(console.error);
