const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkPayment() {
  console.log('\n=== Checking User Payment ===\n');
  
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      poolItem: {
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          pool: {
            select: {
              id: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  sourceUrl: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  console.log(`Found ${payments.length} recent payments:\n`);
  
  payments.forEach(p => {
    console.log(`Payment ${p.id}:`);
    console.log('  Status:', p.status);
    console.log('  Date:', p.createdAt);
    
    if (p.poolItem) {
      console.log('  PoolItem ID:', p.poolItem.id);
      console.log('  Qty:', p.poolItem.qty);
      console.log('  Price:', p.poolItem.unitPrice);
      
      if (p.poolItem.pool) {
        console.log('  Pool ID:', p.poolItem.pool.id);
        
        if (p.poolItem.pool.product) {
          console.log('  Product ID:', p.poolItem.pool.product.id);
          console.log('  Product Title:', p.poolItem.pool.product.title);
          console.log('  Product sourceUrl:', p.poolItem.pool.product.sourceUrl);
        }
      }
    } else {
      console.log('  No poolItem linked');
    }
    
    console.log();
  });
  
  await prisma.$disconnect();
}

checkPayment().catch(console.error);
