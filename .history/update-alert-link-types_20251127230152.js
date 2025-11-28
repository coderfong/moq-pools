const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function updateAlertLinks() {
  try {
    console.log('🔧 Updating alert links for ORDER and PAYMENT types...\n');

    // Update all ORDER type alerts to point to order tracking
    const orderResult = await db.$executeRaw`
      UPDATE "Alert"
      SET link = '/account/orders/tracking'
      WHERE type = 'ORDER'
    `;
    console.log(`✅ Updated ${orderResult} ORDER alerts to /account/orders/tracking`);

    // Update all PAYMENT type alerts to point to payments page
    const paymentResult = await db.$executeRaw`
      UPDATE "Alert"
      SET link = '/account/payments'
      WHERE type = 'PAYMENT'
    `;
    console.log(`✅ Updated ${paymentResult} PAYMENT alerts to /account/payments`);

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

updateAlertLinks();
