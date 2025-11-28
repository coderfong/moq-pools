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
                poolItems: true
              }
            },
            poolItems: {
              select: {
                unitPrice: true,
                quantity: true,
                payment: {
                  select: {
                    status: true
                  }
                }
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
          totalOrders: user._count.poolItems,
          totalSpent: user.poolItems
            .filter(item => item.payment?.status === 'CAPTURED')
            .reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity), 0)
        }));
        break;

      case 'pools':
        data = await prisma.pool.findMany({
          include: {
            product: {
              select: {
                title: true
              }
            },
            _count: {
              select: { items: true }
            },
            items: {
              select: {
                quantity: true
              }
            }
          }
        });

        // Transform pool data for export
        data = data.map(pool => {
          const pledgedQty = pool.items.reduce((sum, item) => sum + item.quantity, 0);
          const progress = pool.targetQty ? Math.round((pledgedQty / pool.targetQty) * 100) : 0;

          return {
            id: pool.id,
            productTitle: pool.product?.title || 'Untitled Pool',
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
        data = await prisma.poolItem.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            },
            pool: {
              select: {
                product: {
                  select: {
                    title: true
                  }
                }
              }
            }
          }
        });

        // Transform pool item data for export
        data = data.map(item => ({
          id: item.id,
          userId: item.userId,
          userEmail: item.user?.email || 'Unknown',
          productTitle: item.pool?.product?.title || 'Unknown Pool',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: (Number(item.unitPrice) * item.quantity) || 0,
          status: item.poolItemStatus,
          createdAt: item.createdAt
        }));
        break;

      case 'payments':
        data = await prisma.payment.findMany({
          include: {
            poolItem: {
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
          orderId: payment.poolItemId,
          userId: payment.poolItem?.userId || 'Unknown',
          amount: Number(payment.amount),
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