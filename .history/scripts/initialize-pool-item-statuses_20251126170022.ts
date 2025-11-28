/**
 * Initialize pool item statuses for existing records
 * This script sets appropriate initial statuses based on payment and shipment state
 */

import { getPrisma } from '../src/lib/prisma';

async function initializePoolItemStatuses() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('Prisma not available');
    return;
  }

  console.log('Starting pool item status initialization...\n');

  try {
    // Fetch all pool items
    const poolItems = await (prisma as any).poolItem.findMany({
      include: {
        payment: true,
        shipment: true,
        pool: {
          include: {
            product: {
              select: { title: true }
            }
          }
        }
      }
    });

    console.log(`Found ${poolItems.length} pool items to process\n`);

    let updated = 0;
    
    for (const item of poolItems) {
      let newStatus = 'JOINING'; // Default
      let reason = 'Initial status';

      // Determine appropriate status based on current state
      if (item.shipment) {
        if (item.shipment.status === 'DELIVERED') {
          newStatus = 'DELIVERED';
          reason = 'Shipment status is delivered';
        } else if (item.shipment.status === 'IN_TRANSIT') {
          newStatus = 'IN_TRANSIT';
          reason = 'Shipment in transit';
        } else if (item.shipment.trackingNo) {
          newStatus = 'PREPARING_SHIPMENT';
          reason = 'Shipment has tracking number';
        }
      } else if (item.payment) {
        if (item.payment.status === 'PAID' || item.payment.status === 'CAPTURED') {
          newStatus = 'PAYMENT_CONFIRMED';
          reason = 'Payment confirmed';
        } else if (item.payment.status === 'AUTHORIZED') {
          newStatus = 'PAYMENT_PENDING';
          reason = 'Payment authorized';
        } else if (item.payment.status === 'PENDING') {
          newStatus = 'PAYMENT_PENDING';
          reason = 'Payment pending';
        } else if (item.payment.status === 'REFUNDED') {
          newStatus = 'REFUNDED';
          reason = 'Payment refunded';
        } else if (item.payment.status === 'FAILED') {
          newStatus = 'CANCELLED';
          reason = 'Payment failed';
        }
      } else {
        // No payment yet, user just joined
        newStatus = 'JOINING';
        reason = 'User joined pool, no payment yet';
      }

      // Update the pool item status
      await (prisma as any).poolItem.update({
        where: { id: item.id },
        data: { poolItemStatus: newStatus }
      });

      // Create initial history entry
      await (prisma as any).poolItemStatusHistory.create({
        data: {
          poolItemId: item.id,
          fromStatus: null,
          toStatus: newStatus,
          notes: `${reason} (initial migration)`,
          automated: true
        }
      });

      const productTitle = item.pool?.product?.title || 'Unknown Product';
      console.log(`✓ Updated ${item.id.substring(0, 8)}: ${productTitle} → ${newStatus}`);
      updated++;
    }

    console.log(`\n✅ Successfully initialized ${updated} pool item statuses`);

  } catch (error) {
    console.error('Error initializing pool item statuses:', error);
    throw error;
  }
}

// Run the script
initializePoolItemStatuses()
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
