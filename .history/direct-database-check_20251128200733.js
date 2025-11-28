const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function directDatabaseCheck() {
  try {
    console.log('=== DIRECT DATABASE QUERY ===\n');

    // Use raw SQL to bypass enum validation
    const poolsRaw = await prisma.$queryRaw`SELECT id, status FROM "Pool"`;
    console.log('Pools in database:');
    poolsRaw.forEach(pool => {
      console.log(`  ${pool.id} - Status: "${pool.status}"`);
    });

    const usersRaw = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    console.log(`\nUsers: ${usersRaw[0].count}`);

    const poolItemsRaw = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PoolItem"`;
    console.log(`PoolItems: ${poolItemsRaw[0].count}`);

    const productsRaw = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product"`;
    console.log(`Products: ${productsRaw[0].count}`);

    const paymentsRaw = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Payment"`;
    console.log(`Payments: ${paymentsRaw[0].count}`);

    // Check users
    const sampleUsersRaw = await prisma.$queryRaw`SELECT id, email, role FROM "User" LIMIT 3`;
    console.log('\nSample Users:');
    sampleUsersRaw.forEach(user => {
      console.log(`  ${user.id} - ${user.email} (${user.role})`);
    });

    // Check pool items
    const sampleItemsRaw = await prisma.$queryRaw`
      SELECT pi.id, pi.quantity, u.email as user_email, pr.title as product_title
      FROM "PoolItem" pi
      LEFT JOIN "User" u ON pi."userId" = u.id
      LEFT JOIN "Pool" p ON pi."poolId" = p.id
      LEFT JOIN "Product" pr ON p."productId" = pr.id
      LIMIT 3
    `;
    console.log('\nSample PoolItems:');
    sampleItemsRaw.forEach(item => {
      console.log(`  ${item.id} - ${item.user_email} ordered ${item.quantity} of ${item.product_title || 'Unknown'}`);
    });

    console.log('\n=== END CHECK ===');

  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

directDatabaseCheck();