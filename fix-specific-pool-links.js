const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function fixSpecificPoolIdLinks() {
  try {
    console.log('🔧 Fixing alerts with Pool ID: cmievzk5o000p9ehvx0p4abgt\n');

    // This is the Batter Dispenser pool - should redirect to cmg13wyz105uerdvr44gguwga
    const poolId = 'cmievzk5o000p9ehvx0p4abgt';
    const correctSavedListingId = 'cmg13wyz105uerdvr44gguwga';

    // Find all alerts with this pool link
    const alerts = await db.$queryRaw`
      SELECT id, type, title, link, "poolId"
      FROM "Alert"
      WHERE link = ${`/pools/${poolId}`}
    `;

    console.log(`Found ${alerts.length} alerts with the wrong link\n`);

    if (alerts.length === 0) {
      console.log('No alerts found with that link. Checking by poolId field...');
      
      const alertsByPoolId = await db.$queryRaw`
        SELECT id, type, title, link, "poolId"
        FROM "Alert"
        WHERE "poolId" = ${poolId}
      `;
      
      console.log(`\nFound ${alertsByPoolId.length} alerts with poolId = ${poolId}`);
      
      for (const alert of alertsByPoolId) {
        console.log(`\n[${alert.id}] ${alert.type}: ${alert.title}`);
        console.log(`  Current link: ${alert.link}`);
        
        // Update link to use SavedListing ID
        await db.$executeRaw`
          UPDATE "Alert"
          SET link = ${`/pools/${correctSavedListingId}`}
          WHERE id = ${alert.id}
        `;
        console.log(`  ✅ Updated to: /pools/${correctSavedListingId}`);
      }
      
      return;
    }

    // Update all found alerts
    for (const alert of alerts) {
      console.log(`[${alert.id}] ${alert.type}: ${alert.title}`);
      console.log(`  Old: ${alert.link}`);
      
      await db.$executeRaw`
        UPDATE "Alert"
        SET link = ${`/pools/${correctSavedListingId}`}
        WHERE id = ${alert.id}
      `;
      
      console.log(`  ✅ New: /pools/${correctSavedListingId}\n`);
    }

    console.log(`\n✅ Updated ${alerts.length} alerts`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixSpecificPoolIdLinks();
