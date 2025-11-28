const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixSystemProduct() {
  console.log('\n=== Fixing System-Created Product ===\n');
  
  // Update the existing product to be inactive
  const updated = await prisma.product.update({
    where: { id: 'cmievzk36000n9ehviblwzq6x' },
    data: {
      isActive: false
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      isActive: true,
      pool: {
        select: {
          id: true,
          pledgedQty: true,
          targetQty: true
        }
      }
    }
  });
  
  console.log('Updated Product:');
  console.log('  ID:', updated.id);
  console.log('  Title:', updated.title);
  console.log('  sourceUrl:', updated.sourceUrl);
  console.log('  isActive:', updated.isActive);
  if (updated.pool) {
    console.log('  Pool:', `${updated.pool.pledgedQty}/${updated.pool.targetQty}`);
  }
  
  console.log('\n✅ Product set to inactive - will not show as separate listing');
  console.log('Pool progress will still display on the SavedListing card via sourceUrl mapping');
  
  await prisma.$disconnect();
}

fixSystemProduct().catch(console.error);
