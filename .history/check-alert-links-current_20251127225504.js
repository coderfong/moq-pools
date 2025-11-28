const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkAlertLinks() {
  try {
    const alerts = await db.$queryRaw`
      SELECT id, type, title, link, "poolId", timestamp
      FROM "Alert"
      WHERE "userId" = 'cmhjey0tq0000fp8f20ixj53g'
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    console.log('🔔 Recent alerts:');
    alerts.forEach((alert, idx) => {
      console.log(`\n[${idx + 1}] ${alert.type}: ${alert.title}`);
      console.log(`    Link: ${alert.link || 'None'}`);
      console.log(`    PoolId: ${alert.poolId || 'None'}`);
      console.log(`    Created: ${alert.timestamp}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkAlertLinks();
