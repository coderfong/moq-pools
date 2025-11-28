import { prisma } from '@/lib/prisma';
import AdminPoolsClient from './AdminPoolsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPoolsPage() {
  if (!prisma) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Pools</h1>
      <div className="mt-4 p-4 border rounded-lg text-gray-600">Database is not configured.</div>
    </div>
  );

  const pools = await prisma.pool.findMany({
    include: {
      product: {
        select: {
          title: true,
          unitPrice: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedPools = pools.map((p) => ({
    id: p.id,
    status: p.status,
    pledgedQty: p.pledgedQty,
    targetQty: p.targetQty,
    deadlineAt: p.deadlineAt?.toISOString() || null,
    product: {
      title: p.product.title,
      unitPrice: Number(p.product.unitPrice),
    },
    _count: {
      items: p._count.items,
    },
  }));

  return <AdminPoolsClient pools={formattedPools} />;
}
