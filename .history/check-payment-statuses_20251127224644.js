const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkPaymentStatuses() {
  try {
    // Check current payment statuses
    const payments = await db.$queryRaw`
      SELECT DISTINCT status FROM "Payment"
    `;
    
    console.log('📊 Current Payment statuses in database:', payments);
    
    // Get all payments
    const allPayments = await db.$queryRaw`
      SELECT id, status, amount, currency, "createdAt"
      FROM "Payment"
      ORDER BY "createdAt" DESC
    `;
    
    console.log(`\n💳 Total payments: ${allPayments.length}`);
    allPayments.forEach(p => {
      console.log(`  ${p.id}: ${p.status} - ${p.amount} ${p.currency} - ${p.createdAt}`);
    });
    
    // Check if there are AUTHORIZED payments
    const authorizedCount = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Payment" WHERE status = 'AUTHORIZED'
    `;
    console.log(`\n🔒 AUTHORIZED payments: ${authorizedCount[0].count}`);
    
    // Get pool items for user
    const userEmail = 'agarioplayersg123@gmail.com';
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });
    
    if (user) {
      const poolItems = await db.$queryRaw`
        SELECT pi.id, pi.status, pi.qty, p.status as payment_status, p.amount
        FROM "PoolItem" pi
        LEFT JOIN "Payment" p ON p."poolItemId" = pi.id
        WHERE pi."userId" = ${user.id}
        ORDER BY pi."createdAt" DESC
      `;
      
      console.log(`\n📦 User's pool items: ${poolItems.length}`);
      poolItems.forEach((item, idx) => {
        console.log(`  [${idx + 1}] ${item.id}: ${item.status} - Qty: ${item.qty} - Payment: ${item.payment_status || 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkPaymentStatuses();
