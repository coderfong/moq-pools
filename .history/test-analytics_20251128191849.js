const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAnalyticsQueries() {
  try {
    console.log('Testing analytics queries...');
    
    // Test basic counts
    const totalUsers = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    console.log('Total Users:', totalUsers[0]);
    
    const totalPools = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Pool"`;
    console.log('Total Pools:', totalPools[0]);
    
    const totalPoolItems = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PoolItem"`;
    console.log('Total PoolItems:', totalPoolItems[0]);
    
    // Test pool status distribution
    const poolStatus = await prisma.$queryRaw`
      SELECT 
        "status",
        COUNT(*) as count
      FROM "Pool"
      GROUP BY "status"
    `;
    console.log('Pool Status Distribution:', poolStatus);
    
    // Test user growth (last 30 days)
    const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('week', "createdAt") as week,
        COUNT(*) as new_users
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week
    `;
    console.log('User Growth (last 30 days):', userGrowth);
    
    console.log('Analytics queries test completed successfully!');
    
  } catch (error) {
    console.error('Error testing analytics queries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalyticsQueries();