const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkPayment() {
  console.log('\n=== Checking User Payment ===\n');
  
  const payments = await prisma.payment.findMany({
    where: { userId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      qty: true,
      unitPrice: true,
      createdAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          url: true
        }
      },
      product: {
        select: {
          id: true,
          title: true,
          sourceUrl: true
        }
      }
    }
  });
  
  console.log(`Found ${payments.length} recent payments:\n`);
  
  payments.forEach(p => {
    console.log(`Payment ${p.id}:`);
    console.log('  Status:', p.status);
    console.log('  Qty:', p.qty);
    console.log('  Price:', p.unitPrice);
    console.log('  Date:', p.createdAt);
    
    if (p.listing) {
      console.log('  Listing ID:', p.listing.id);
      console.log('  Listing Title:', p.listing.title);
      console.log('  Listing URL:', p.listing.url);
    } else {
      console.log('  No listing linked');
    }
    
    if (p.product) {
      console.log('  Product ID:', p.product.id);
      console.log('  Product Title:', p.product.title);
      console.log('  Product sourceUrl:', p.product.sourceUrl);
    } else {
      console.log('  No product linked');
    }
    
    console.log();
  });
  
  await prisma.$disconnect();
}

checkPayment().catch(console.error);
