import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '../../../_lib/session';
import { updatePoolItemStatus } from '@/lib/poolItemStatus';
import { createUserAlert } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma: any = getPrisma();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, poolIds, ...data } = body;

    if (!poolIds || !Array.isArray(poolIds) || poolIds.length === 0) {
      return NextResponse.json({ error: 'No pools selected' }, { status: 400 });
    }

    let message = '';
    let affectedCount = 0;

    switch (action) {
      case 'mark_moq_reached':
        // Update pool status
        await prisma.pool.updateMany({
          where: { id: { in: poolIds } },
          data: { moqReachedAt: new Date() },
        });

        // Update all pool items to MOQ_REACHED status
        for (const poolId of poolIds) {
          const poolItems = await prisma.poolItem.findMany({
            where: { poolId },
            include: {
              user: { select: { id: true, name: true, email: true } },
              pool: {
                include: {
                  product: { select: { title: true } },
                },
              },
            },
          });

          for (const item of poolItems) {
            await updatePoolItemStatus({
              poolItemId: item.id,
              newStatus: 'MOQ_REACHED',
              notes: 'Pool reached MOQ - awaiting payment capture',
              isAutomated: true,
            });

            await createUserAlert({
              userId: item.userId,
              type: 'GROUP_UPDATE',
              title: 'MOQ Reached! 🎉',
              body: `Great news! The pool for ${item.pool.product.title} has reached its MOQ. Payment will be captured soon.`,
              link: `/pools/${poolId}`,
              poolId,
              productName: item.pool.product.title,
            });
          }
          affectedCount += poolItems.length;
        }
        message = `Marked ${poolIds.length} pool(s) as MOQ reached and notified ${affectedCount} participant(s)`;
        break;

      case 'place_orders':
        // Update pool status to ACTIVE
        await prisma.pool.updateMany({
          where: { id: { in: poolIds } },
          data: { status: 'ACTIVE' },
        });

        // Update all pool items to ORDER_PLACED status
        for (const poolId of poolIds) {
          const poolItems = await prisma.poolItem.findMany({
            where: { poolId },
            include: {
              user: { select: { id: true } },
              pool: {
                include: {
                  product: { select: { title: true } },
                },
              },
            },
          });

          for (const item of poolItems) {
            await updatePoolItemStatus({
              poolItemId: item.id,
              newStatus: 'ORDER_PLACED',
              notes: 'Order placed with supplier',
              isAutomated: true,
            });

            await createUserAlert({
              userId: item.userId,
              type: 'ORDER',
              title: 'Order Placed 📦',
              body: `Your order for ${item.pool.product.title} has been placed with the supplier!`,
              link: `/account/orders/tracking`,
              poolId,
              productName: item.pool.product.title,
            });
          }
          affectedCount += poolItems.length;
        }
        message = `Placed orders for ${poolIds.length} pool(s) and notified ${affectedCount} participant(s)`;
        break;

      case 'update_shipping':
        const { carrier, tracking } = data;
        if (!carrier || !tracking) {
          return NextResponse.json({ error: 'Missing carrier or tracking info' }, { status: 400 });
        }

        const trackingNumbers = tracking.split(',').map((t: string) => t.trim());

        for (const poolId of poolIds) {
          const poolItems = await prisma.poolItem.findMany({
            where: { poolId },
            include: {
              user: { select: { id: true } },
              pool: {
                include: {
                  product: { select: { title: true } },
                },
              },
            },
          });

          for (let i = 0; i < poolItems.length; i++) {
            const item = poolItems[i];
            const trackingNum = trackingNumbers[i % trackingNumbers.length];

            // Create or update shipment
            const existingShipment = await prisma.shipment.findFirst({
              where: { poolItemId: item.id },
            });

            if (existingShipment) {
              await prisma.shipment.update({
                where: { id: existingShipment.id },
                data: {
                  carrier,
                  trackingNumber: trackingNum,
                  status: 'IN_TRANSIT',
                  shippedAt: new Date(),
                },
              });
            } else {
              await prisma.shipment.create({
                data: {
                  poolItemId: item.id,
                  carrier,
                  trackingNumber: trackingNum,
                  status: 'IN_TRANSIT',
                  shippedAt: new Date(),
                },
              });
            }

            await updatePoolItemStatus({
              poolItemId: item.id,
              newStatus: 'IN_TRANSIT',
              notes: `Shipped via ${carrier} - Tracking: ${trackingNum}`,
              isAutomated: true,
            });

            await createUserAlert({
              userId: item.userId,
              type: 'SHIPPING',
              title: 'Order Shipped! 🚚',
              body: `Your order for ${item.pool.product.title} has been shipped via ${carrier}. Tracking: ${trackingNum}`,
              link: `/account/orders/tracking`,
              poolId,
              productName: item.pool.product.title,
            });
          }
          affectedCount += poolItems.length;
        }
        message = `Updated shipping for ${poolIds.length} pool(s), ${affectedCount} participant(s) notified`;
        break;

      case 'send_notification':
        const { title, body: notifBody } = data;
        if (!title || !notifBody) {
          return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
        }

        for (const poolId of poolIds) {
          const poolItems = await prisma.poolItem.findMany({
            where: { poolId },
            include: {
              pool: {
                include: {
                  product: { select: { title: true } },
                },
              },
            },
          });

          for (const item of poolItems) {
            await createUserAlert({
              userId: item.userId,
              type: 'SYSTEM',
              title,
              body: notifBody,
              link: `/pools/${poolId}`,
              poolId,
              productName: item.pool.product.title,
            });
          }
          affectedCount += poolItems.length;
        }
        message = `Sent notifications to ${affectedCount} participant(s) across ${poolIds.length} pool(s)`;
        break;

      case 'export_csv':
        // Generate CSV data for selected pools
        const exportData: any[] = [];
        
        for (const poolId of poolIds) {
          const poolItems = await prisma.poolItem.findMany({
            where: { poolId },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              pool: {
                include: {
                  product: {
                    select: {
                      title: true,
                      unitPrice: true,
                    },
                  },
                },
              },
              payment: {
                select: {
                  amount: true,
                  currency: true,
                  status: true,
                  paidAt: true,
                },
              },
              address: true,
            },
          });

          poolItems.forEach(item => {
            exportData.push({
              'Pool ID': item.poolId,
              'Product': item.pool.product.title,
              'User Name': item.user.name || 'N/A',
              'User Email': item.user.email,
              'Quantity': item.quantity,
              'Unit Price': item.unitPrice,
              'Total Amount': item.payment?.amount || 0,
              'Currency': item.currency,
              'Payment Status': item.payment?.status || 'N/A',
              'Paid At': item.payment?.paidAt?.toISOString() || 'N/A',
              'Status': item.poolItemStatus || 'N/A',
              'Address': item.address ? `${item.address.line1}, ${item.address.city}, ${item.address.country}` : 'N/A',
              'Created At': item.createdAt.toISOString(),
            });
          });
        }

        // Convert to CSV
        if (exportData.length === 0) {
          return NextResponse.json({ error: 'No data to export' }, { status: 400 });
        }

        const headers = Object.keys(exportData[0]);
        const csvRows = [
          headers.join(','),
          ...exportData.map(row =>
            headers.map(header => {
              const value = row[header]?.toString() || '';
              // Escape commas and quotes
              return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
          ),
        ];
        const csvContent = csvRows.join('\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="pools-export-${Date.now()}.csv"`,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
