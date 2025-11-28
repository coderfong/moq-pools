const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificPools() {
  try {
    const poolIds = [
      'cmh1ciyqx078i2opk598sii5l',
      'cmh1gcizy00sc13sznwscmkqs',
      'cmh1ghgw900vh13sz2ifejg93'
    ];
    
    console.log('🔍 Checking specific pools for unavailable products...\n');
    
    for (const poolId of poolIds) {
      console.log(`📋 Pool ID: ${poolId}`);
      
      const pool = await prisma.pool.findUnique({
        where: { id: poolId },
        include: {
          product: {
            include: {
              supplier: true
            }
          }
        }
      });
      
      if (!pool) {
        console.log(`   ❌ Pool not found`);
        continue;
      }
      
      console.log(`   Product Title: "${pool.product.title}"`);
      console.log(`   Product ID: ${pool.product.id}`);
      console.log(`   Platform: ${pool.product.sourcePlatform}`);
      console.log(`   Source URL: ${pool.product.sourceUrl || 'None'}`);
      console.log(`   Active: ${pool.product.isActive}`);
      console.log(`   Pool Status: ${pool.status}`);
      console.log(`   Images: ${pool.product.imagesJson || 'None'}`);
      console.log(`   Supplier: ${pool.product.supplier?.name || 'None'}`);
      console.log();
    }
    
    // Check if any of these products have "Product Not Available" or similar titles
    const products = await prisma.product.findMany({
      where: {
        pool: {
          id: {
            in: poolIds
          }
        }
      },
      select: {
        id: true,
        title: true,
        sourcePlatform: true,
        sourceUrl: true,
        isActive: true,
        pool: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    
    console.log('📊 Summary of products from these pools:');
    products.forEach((product, i) => {
      console.log(`  ${i + 1}. "${product.title}" (${product.sourcePlatform})`);
      console.log(`     Product ID: ${product.id}`);
      console.log(`     Pool ID: ${product.pool?.id}`);
      console.log(`     Active: ${product.isActive}`);
      console.log(`     URL: ${product.sourceUrl || 'None'}`);
      console.log();
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPools();