import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params;

    // Check if user is admin (you may want to add proper auth here)
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    let data;

    switch (type) {
      case 'users':
        data = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true
              }
            },
            orders: {
              select: {
                totalPrice: true,
                status: true
              }
            }
          }
        });

        // Transform user data for export
        data = data.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          status: 'active', // You may want to add a status field to User model
          createdAt: user.createdAt,
          totalOrders: user._count.orders,
          totalSpent: user.orders
            .filter(order => order.status === 'COMPLETED')
            .reduce((sum, order) => sum + (order.totalPrice || 0), 0)
        }));
        break;

      case 'pools':
        data = await prisma.pool.findMany({
          include: {
            _count: {
              select: { orders: true }
            },
            orders: {
              select: {
                quantity: true
              }
            }
          }
        });

        // Transform pool data for export
        data = data.map(pool => {
          const pledgedQty = pool.orders.reduce((sum, order) => sum + order.quantity, 0);
          const progress = pool.targetQty ? Math.round((pledgedQty / pool.targetQty) * 100) : 0;

          return {
            id: pool.id,
            productTitle: pool.productTitle || 'Untitled Pool',
            status: pool.status,
            targetQty: pool.targetQty || 0,
            pledgedQty,
            progress,
            deadlineAt: pool.deadlineAt,
            createdAt: pool.createdAt
          };
        });
        break;

      case 'orders':
        data = await prisma.order.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            },
            pool: {
              select: {
                productTitle: true
              }
            }
          }
        });

        // Transform order data for export
        data = data.map(order => ({
          id: order.id,
          userId: order.userId,
          userEmail: order.user?.email || 'Unknown',
          productTitle: order.pool?.productTitle || 'Unknown Pool',
          quantity: order.quantity,
          unitPrice: order.unitPrice || 0,
          totalPrice: order.totalPrice || 0,
          status: order.status,
          createdAt: order.createdAt
        }));
        break;

      case 'payments':
        data = await prisma.payment.findMany({
          include: {
            order: {
              select: {
                id: true,
                userId: true
              }
            }
          }
        });

        // Transform payment data for export
        data = data.map(payment => ({
          id: payment.id,
          orderId: payment.orderId,
          userId: payment.order?.userId || 'Unknown',
          amount: payment.amount,
          currency: payment.currency || 'USD',
          status: payment.status,
          paymentMethod: payment.paymentMethod || 'card',
          createdAt: payment.createdAt
        }));
        break;

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}