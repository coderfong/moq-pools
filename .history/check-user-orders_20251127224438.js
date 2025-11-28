const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkUserOrders() {
  try {
    const userEmail = 'agarioplayersg123@gmail.com';
    
    console.log('🔍 Checking orders for:', userEmail);
    console.log('='.repeat(60));
    
    // Find user
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('\n✅ User found:', user);
    
    // Check pool items
    const poolItems = await db.poolItem.findMany({
      where: { userId: user.id },
      include: {
        pool: {
          select: {
            id: true,
            status: true,
            targetQty: true,
            pledgedQty: true,
            product: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true
          }
        },
        shipment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📦 POOL ITEMS:', poolItems.length);
    console.log('='.repeat(60));
    
    if (poolItems.length === 0) {
      console.log('\n⚠️  NO POOL ITEMS FOUND!');
      console.log('This means the user has not joined any pools yet.');
      
      // Check if there are any payments
      const payments = await db.payment.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          status: true,
          amount: true,
          poolItemId: true,
          createdAt: true
        }
      });
      
      console.log('\n💳 Payments found:', payments.length);
      if (payments.length > 0) {
        console.log('Payments:', JSON.stringify(payments, null, 2));
      }
      
    } else {
      poolItems.forEach((item, idx) => {
        console.log(`\n[${idx + 1}] Pool Item: ${item.id}`);
        console.log(`    Product: ${item.pool.product.title}`);
        console.log(`    Pool: ${item.pool.id}`);
        console.log(`    Pool Status: ${item.pool.status}`);
        console.log(`    Item Status: ${item.status}`);
        console.log(`    Quantity: ${item.qty}`);
        console.log(`    Payment: ${item.payment ? `${item.payment.status} - ${item.payment.amount} ${item.payment.currency}` : 'None'}`);
        console.log(`    Shipment: ${item.shipment ? item.shipment.status : 'None'}`);
        console.log(`    Created: ${item.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUserOrders();
