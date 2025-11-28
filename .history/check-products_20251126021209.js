// Check current products and pools
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        pool: true,
        supplier: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\n📦 Recent Products (showing ${products.length}):\n`);
    
    products.forEach((p, i) => {
      console.log(`${i + 1}. Product ID: ${p.id}`);
      console.log(`   Title: ${p.title}`);
      console.log(`   Supplier: ${p.supplier.name}`);
      console.log(`   Source: ${p.sourcePlatform} - ${p.sourceUrl || 'N/A'}`);
      console.log(`   Created: ${p.createdAt}`);
      if (p.pool) {
        console.log(`   Pool: ${p.pool.id} - ${p.pool.pledgedQty}/${p.pool.targetQty} (${p.pool.status})`);
      } else {
        console.log(`   Pool: None`);
      }
      console.log('');
    });

    // Check for recently created "System" supplier products
    const systemProducts = await prisma.product.findMany({
      where: {
        supplier: {
          name: 'System'
        }
      },
      include: {
        pool: {
          include: {
            items: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true
                  }
                },
                payment: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (systemProducts.length > 0) {
      console.log(`\n🔧 System Products (${systemProducts.length}):\n`);
      systemProducts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title}`);
        console.log(`   Product ID: ${p.id}`);
        console.log(`   URL: ${p.sourceUrl}`);
        if (p.pool) {
          console.log(`   Pool ID: ${p.pool.id}`);
          console.log(`   Progress: ${p.pool.pledgedQty}/${p.pool.targetQty}`);
          if (p.pool.items.length > 0) {
            console.log(`   Pool Items:`);
            p.pool.items.forEach(item => {
              console.log(`     - User: ${item.user?.email} (${item.user?.name})`);
              console.log(`       Qty: ${item.quantity}, Status: ${item.payment?.status}`);
            });
          }
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
