// Check payments status for a pool
// Use the regenerated client
delete require.cache[require.resolve('@prisma/client')];
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

const poolId = process.argv[2] || 'cmievzk5o000p9ehvx0p4abgt';

(async () => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        items: {
          include: {
            payment: true,
            user: { select: { email: true, name: true } }
          },
        },
        product: { select: { title: true } }
      },
    });

    if (!pool) {
      console.log('Pool not found');
      return;
    }

    console.log('\n📦 Pool:', pool.product?.title);
    console.log('Progress:', pool.pledgedQty + '/' + pool.targetQty);
    console.log('Status:', pool.status);
    console.log('Items:', pool.items.length);
    console.log('\n💰 Payments:');

    pool.items.forEach((item, idx) => {
      console.log(`\n${idx + 1}. User: ${item.user?.email || 'Unknown'}`);
      console.log('   Quantity:', item.quantity);
      if (item.payment) {
        console.log('   Payment ID:', item.payment.id);
        console.log('   Status:', item.payment.status);
        console.log('   Reference:', item.payment.reference);
        console.log('   Amount:', item.payment.currency.toUpperCase(), (item.payment.amount / 100).toFixed(2));
      } else {
        console.log('   ❌ No payment record');
      }
    });

    console.log('\n📊 Summary:');
    const statusCounts = {};
    pool.items.forEach(item => {
      const status = item.payment?.status || 'NO_PAYMENT';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
