import { prisma } from '@/lib/prisma';
import PoolsClient from './PoolsClient';

export const dynamic = 'force-dynamic';

export default async function PoolsIndexPage({ 
  searchParams 
}: { 
  searchParams?: { status?: string; sort?: string; view?: string } 
}) {
  if (!prisma) {
    return (
      <div className="px-6 md:px-10 xl:px-16 py-6">
        <h1 className="text-2xl font-semibold mb-5">Pools</h1>
        <p className="text-sm text-gray-600">Database not configured. Set DATABASE_URL to view pools.</p>
      </div>
    );
  }

  const statusFilter = searchParams?.status;
  const sortBy = searchParams?.sort || 'moq-progress';

  // Build where clause based on status filter
  let whereClause: any = {};
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'open') {
      whereClause.status = 'OPEN';
    } else if (statusFilter === 'locked') {
      whereClause.status = { in: ['LOCKED', 'ORDER_PLACED'] };
    } else if (statusFilter === 'fulfilled') {
      whereClause.status = { in: ['FULFILLING', 'FULFILLED'] };
    }
  }

  // Build orderBy clause
  let orderByClause: any;
  if (sortBy === 'moq-progress') {
    // Sort by MOQ progress (pledgedQty/targetQty ratio) descending
    // We'll calculate this after fetching
    orderByClause = { pledgedQty: 'desc' }; // Temp ordering, will sort in JS
  } else if (sortBy === 'newest') {
    orderByClause = { createdAt: 'desc' };
  } else if (sortBy === 'ending-soon') {
    orderByClause = { deadlineAt: 'asc' };
  } else if (sortBy === 'most-popular') {
    orderByClause = { pledgedQty: 'desc' };
  } else {
    orderByClause = { pledgedQty: 'desc' };
  }

  // Fetch pools with product and supplier details
  const pools = await prisma.pool.findMany({
    where: whereClause,
    include: {
      product: {
        include: {
          supplier: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: orderByClause,
    take: 50,
  });

  // Transform data for client component
  let poolsData = pools.map((pool) => {
    const images = pool.product.imagesJson ? JSON.parse(pool.product.imagesJson as string) : [];
    const progress = Math.floor((pool.pledgedQty / pool.targetQty) * 100);
    
    return {
      id: pool.id,
      productId: pool.product.id,
      title: pool.product.title,
      image: images[0] || null,
      unitPrice: Number(pool.product.unitPrice),
      currency: pool.product.baseCurrency || 'USD',
      status: pool.status,
      pledgedQty: pool.pledgedQty,
      targetQty: pool.targetQty,
      progress,
      participantCount: pool._count.items,
      deadlineAt: pool.deadlineAt?.toISOString() || null,
      supplier: pool.product.supplier?.name || 'Unknown',
      moq: pool.product.moqQty || 0,
    };
  });

  // Apply client-side sorting for MOQ progress
  if (sortBy === 'moq-progress') {
    poolsData.sort((a, b) => b.progress - a.progress);
  }

  return (
    <PoolsClient
      pools={poolsData}
      initialStatus={statusFilter || 'all'}
      initialSort={sortBy}
      initialView={searchParams?.view || 'grid'}
    />
  );
}
