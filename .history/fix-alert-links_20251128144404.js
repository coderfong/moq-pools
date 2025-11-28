const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function fixAlertLinks() {
  try {
    console.log('🔧 Fixing alert links to use SavedListing IDs...\n');

    // Get all alerts with pool links
    const alerts = await db.$queryRaw`
      SELECT a.id, a."poolId", a.link, pr."sourceUrl"
      FROM "Alert" a
      JOIN "Pool" p ON p.id = a."poolId"
      JOIN "Product" pr ON pr.id = p."productId"
      WHERE a.link LIKE '/pools/%'
      AND a.link NOT LIKE '/pools/cmg%'
      AND a.link NOT LIKE '/pools/cmh%'
    `;

    console.log(`Found ${alerts.length} alerts with incorrect pool links\n`);

    if (alerts.length === 0) {
      console.log('✅ All alerts already have correct links!');
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const alert of alerts) {
      try {
        // Find the SavedListing for this product's sourceUrl
        const listing = await db.savedListing.findFirst({
          where: { url: alert.sourceUrl },
          select: { id: true }
        });

        if (listing) {
          // Update the alert link
          await db.$executeRaw`
            UPDATE "Alert"
            SET link = ${`/pools/${listing.id}`}
            WHERE id = ${alert.id}
          `;
          console.log(`✅ Fixed alert ${alert.id}: ${alert.link} → /pools/${listing.id}`);
          fixed++;
        } else {
          console.log(`⚠️  No SavedListing found for alert ${alert.id} (sourceUrl: ${alert.sourceUrl})`);
          // Update to orders page as fallback
          await db.$executeRaw`
            UPDATE "Alert"
            SET link = '/account/orders'
            WHERE id = ${alert.id}
          `;
          console.log(`   Updated to /account/orders instead`);
          fixed++;
        }
      } catch (err) {
        console.error(`❌ Failed to fix alert ${alert.id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n\n📊 SUMMARY:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${alerts.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixAlertLinks();
