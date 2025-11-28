// Clean up duplicate products and fix pool linkage
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🔍 Searching for duplicate products...\n');
  
  try {
    // Find all products with the same sourceUrl
    const allProducts = await prisma.product.findMany({
      where: {
        sourceUrl: { not: null }
      },
      include: {
        pool: {
          include: {
            items: true
          }
        },
        supplier: true
      },
      orderBy: {
        createdAt: 'asc' // Oldest first
      }
    });

    // Group by sourceUrl
    const grouped = {};
    allProducts.forEach(p => {
      if (p.sourceUrl) {
        if (!grouped[p.sourceUrl]) {
          grouped[p.sourceUrl] = [];
        }
        grouped[p.sourceUrl].push(p);
      }
    });

    // Find duplicates
    const duplicates = Object.entries(grouped).filter(([url, products]) => products.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate products found!');
      return;
    }

    console.log(`Found ${duplicates.length} URLs with duplicate products:\n`);

    for (const [url, products] of duplicates) {
      console.log(`\n📦 URL: ${url}`);
      console.log(`   Title: ${products[0].title}`);
      console.log(`   Duplicates found: ${products.length}\n`);

      // Keep the oldest product (first created)
      const keepProduct = products[0];
      const duplicateProducts = products.slice(1);

      console.log(`   ✅ Keeping: Product ${keepProduct.id} (created ${keepProduct.createdAt})`);
      if (keepProduct.pool) {
        console.log(`      Pool: ${keepProduct.pool.id} (${keepProduct.pool.pledgedQty}/${keepProduct.pool.targetQty})`);
      }

      // Handle each duplicate
      for (const dup of duplicateProducts) {
        console.log(`\n   ❌ Removing duplicate: Product ${dup.id} (created ${dup.createdAt})`);
        
        if (dup.pool) {
          console.log(`      Has pool: ${dup.pool.id}`);
          
          // If duplicate pool has items, we need to move them to the main pool
          if (dup.pool.items && dup.pool.items.length > 0) {
            console.log(`      ⚠️  Pool has ${dup.pool.items.length} items - migrating to main pool...`);
            
            // Update pool items to point to the main pool
            for (const item of dup.pool.items) {
              await prisma.poolItem.update({
                where: { id: item.id },
                data: { poolId: keepProduct.pool.id }
              });
              console.log(`         Moved poolItem ${item.id} to pool ${keepProduct.pool.id}`);
            }
            
            // Update the main pool's pledged quantity
            const totalDupQty = dup.pool.pledgedQty || 0;
            if (totalDupQty > 0) {
              await prisma.pool.update({
                where: { id: keepProduct.pool.id },
                data: {
                  pledgedQty: {
                    increment: totalDupQty
                  }
                }
              });
              console.log(`         Added ${totalDupQty} to main pool pledgedQty`);
            }
          }
          
          // Delete the duplicate pool
          await prisma.pool.delete({
            where: { id: dup.pool.id }
          });
          console.log(`      Deleted duplicate pool ${dup.pool.id}`);
        }
        
        // Delete the duplicate product
        await prisma.product.delete({
          where: { id: dup.id }
        });
        console.log(`      Deleted duplicate product ${dup.id}`);
      }
    }

    console.log('\n✅ Cleanup complete!\n');
    
    // Show final state
    console.log('📊 Final product counts:');
    const finalProducts = await prisma.product.findMany({
      include: {
        pool: true
      }
    });
    
    console.log(`   Total products: ${finalProducts.length}`);
    console.log(`   Products with pools: ${finalProducts.filter(p => p.pool).length}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
