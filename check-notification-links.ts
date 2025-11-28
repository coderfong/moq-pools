/**
 * Debug Script: Check Notification Links
 * 
 * Run this to verify that notification links are valid and pools exist
 */

import { prisma } from './src/lib/prisma';

async function checkNotificationLinks() {
  if (!prisma) {
    console.error('❌ Database not available');
    return;
  }

  console.log('\n🔍 Checking Notification Links\n' + '='.repeat(60));

  try {
    // Get all alerts with links
    const alerts = await (prisma as any).alert.findMany({
      where: {
        link: { not: null },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 20,
    });

    if (alerts.length === 0) {
      console.log('ℹ️  No alerts with links found in database');
      return;
    }

    console.log(`\nFound ${alerts.length} alerts with links:\n`);

    for (const alert of alerts) {
      const linkType = alert.link?.startsWith('/pools/') ? 'POOL' :
                       alert.link?.startsWith('/orders/') ? 'ORDER' :
                       alert.link?.startsWith('/products/') ? 'PRODUCT' : 'OTHER';
      
      console.log(`\n📌 Alert: ${alert.id}`);
      console.log(`   User: ${alert.user.name} (${alert.user.email})`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Title: ${alert.title}`);
      console.log(`   Link: ${alert.link}`);
      console.log(`   Link Type: ${linkType}`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Created: ${alert.timestamp.toLocaleString()}`);

      // Validate pool links
      if (linkType === 'POOL') {
        const poolId = alert.link.split('/pools/')[1];
        const pool = await (prisma as any).pool.findUnique({
          where: { id: poolId },
          select: {
            id: true,
            status: true,
            product: {
              select: { title: true },
            },
          },
        });

        if (pool) {
          console.log(`   ✅ Pool exists: "${pool.product.title}" (Status: ${pool.status})`);
        } else {
          console.log(`   ❌ Pool NOT FOUND - This link will lead to 404!`);
        }
      }
    }

    // Check for common issues
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:\n');

    const brokenPoolLinks = [];
    for (const alert of alerts.filter(a => a.link?.startsWith('/pools/'))) {
      const poolId = alert.link.split('/pools/')[1];
      const exists = await (prisma as any).pool.findUnique({
        where: { id: poolId },
        select: { id: true },
      });
      
      if (!exists) {
        brokenPoolLinks.push(alert);
      }
    }

    if (brokenPoolLinks.length > 0) {
      console.log(`❌ ${brokenPoolLinks.length} alerts point to non-existent pools`);
      console.log('\nBroken Alert IDs:');
      brokenPoolLinks.forEach(a => {
        console.log(`   - ${a.id}: ${a.link}`);
      });
      console.log('\n💡 Fix: Delete these alerts or update their links');
    } else {
      console.log('✅ All pool links are valid!');
    }

    const unreadCount = alerts.filter(a => a.status === 'UNREAD').length;
    console.log(`📬 ${unreadCount} unread alerts`);
    
    const linksByType = alerts.reduce((acc: any, a) => {
      const type = a.link?.startsWith('/pools/') ? 'pools' :
                   a.link?.startsWith('/orders/') ? 'orders' :
                   a.link?.startsWith('/products/') ? 'products' : 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nLinks by type:');
    Object.entries(linksByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await (prisma as any).$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkNotificationLinks()
    .then(() => {
      console.log('\n✅ Check complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

export { checkNotificationLinks };
