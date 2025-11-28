const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseCounts() {
  try {
    console.log('=== DATABASE CONTENT CHECK ===\n');

    // Check all main tables
    const userCount = await prisma.user.count();
    console.log(`👥 Users: ${userCount}`);

    const poolCount = await prisma.pool.count();
    console.log(`🏊 Pools: ${poolCount}`);

    const poolItemCount = await prisma.poolItem.count();
    console.log(`📦 PoolItems: ${poolItemCount}`);

    const productCount = await prisma.product.count();
    console.log(`🛍️ Products: ${productCount}`);

    const paymentCount = await prisma.payment.count();
    console.log(`💳 Payments: ${paymentCount}`);

    // Check pool statuses
    if (poolCount > 0) {
      console.log('\n📊 Pool Status Breakdown:');
      try {
        const poolStatuses = await prisma.pool.groupBy({
          by: ['status'],
          _count: { status: true }
        });
        
        poolStatuses.forEach(status => {
          console.log(`  ${status.status}: ${status._count.status}`);
        });
      } catch (error) {
        console.log('  Error getting pool statuses, showing individual pools instead:');
        const pools = await prisma.pool.findMany({
          select: { id: true, status: true }
        });
        pools.forEach(pool => {
          console.log(`  Pool ${pool.id}: ${pool.status}`);
        });
      }
    }

    // Show sample data
    if (userCount > 0) {
      console.log('\n👤 Sample Users:');
      const sampleUsers = await prisma.user.findMany({ take: 3 });
      sampleUsers.forEach(user => {
        console.log(`  ${user.id} - ${user.email} (${user.role})`);
      });
    }

    if (poolCount > 0) {
      console.log('\n🏊 Sample Pools:');
      const samplePools = await prisma.pool.findMany({ 
        take: 3,
        include: {
          product: { select: { title: true } }
        }
      });
      samplePools.forEach(pool => {
        console.log(`  ${pool.id} - ${pool.product?.title || 'No title'} (${pool.status})`);
      });
    }

    if (poolItemCount > 0) {
      console.log('\n📦 Sample Pool Items:');
      const sampleItems = await prisma.poolItem.findMany({ 
        take: 3,
        include: {
          user: { select: { email: true } },
          pool: { 
            include: { 
              product: { select: { title: true } } 
            } 
          }
        }
      });
      sampleItems.forEach(item => {
        console.log(`  ${item.id} - ${item.user?.email} ordered ${item.quantity} of ${item.pool?.product?.title || 'Unknown'}`);
      });
    }

    console.log('\n=== END CHECK ===');

  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseCounts();