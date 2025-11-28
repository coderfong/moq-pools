const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function findDuplicates() {
  console.log('\n=== Finding Duplicate Products ===\n');
  
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: 'Batter Dispenser' } },
        { sourceUrl: { contains: '1601576082979' } }
      ]
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      supplierId: true,
      createdAt: true,
      pool: {
        select: {
          id: true,
          pledgedQty: true,
          targetQty: true
        }
      }
    }
  });
  
  console.log(`Found ${products.length} products with "Batter Dispenser" or matching URL:\n`);
  
  products.forEach(p => {
    console.log(`Product ID: ${p.id}`);
    console.log('  Title:', p.title);
    console.log('  SourceUrl:', p.sourceUrl);
    console.log('  SupplierId:', p.supplierId);
    console.log('  Created:', p.createdAt);
    if (p.pool) {
      console.log('  Pool ID:', p.pool.id);
      console.log('  Pool Progress:', `${p.pool.pledgedQty}/${p.pool.targetQty}`);
    } else {
      console.log('  No pool');
    }
    console.log();
  });
  
  await prisma.$disconnect();
}

findDuplicates().catch(console.error);
