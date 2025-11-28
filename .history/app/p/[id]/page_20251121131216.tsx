import { prisma } from '@/lib/prisma';
import { permanentRedirect } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export default async function ProductPage({ params }: { params: { id: string }}) {
  if (!prisma) return <div className="px-6 py-8 text-center">Database unavailable</div>;
  
  const product = await prisma.product.findUnique({ 
    where: { id: params.id }, 
    include: { pool: true, supplier: true }
  });
  
  if (!product) {
    // Back-compat: treat legacy /p/{poolId} links by redirecting to the product page
    const pool = await prisma.pool.findUnique({ where: { id: params.id }, select: { productId: true } });
    if (pool?.productId) permanentRedirect(`/p/${pool.productId}`);
    return <div className="px-6 py-8 text-center">Product not found</div>;
  }
  
  if (!product.pool) return <div className="px-6 py-8 text-center">Pool not found</div>;
  
  const { pool } = product;
  const images = JSON.parse(product.imagesJson) as string[];
  
  // Get similar products from same category/supplier
  const similarProducts = await prisma.product.findMany({
    where: {
      OR: [
        { supplierId: product.supplierId },
        { title: { contains: product.title.split(' ')[0], mode: 'insensitive' } },
      ],
      NOT: { id: product.id },
    },
    include: { pool: true },
    take: 4,
  });

  return (
    <ProductDetailClient 
      product={{
        id: product.id,
        title: product.title,
        description: product.description || '',
        images,
        unitPrice: Number(product.unitPrice),
        baseCurrency: product.baseCurrency || 'USD',
        moqQty: product.moqQty || 0,
        leadTimeDays: product.leadTimeDays || 30,
        maxQtyPerUser: product.maxQtyPerUser || 0,
        sourceUrl: product.sourceUrl || '',
        supplier: {
          name: product.supplier?.name || 'Unknown',
          id: product.supplier?.id || '',
        },
      }}
      pool={{
        id: pool.id,
        status: pool.status,
        pledgedQty: pool.pledgedQty || 0,
        targetQty: pool.targetQty || 0,
        deadlineAt: pool.deadlineAt?.toISOString() || null,
      }}
      similarProducts={similarProducts.map(p => ({
        id: p.id,
        title: p.title,
        image: (JSON.parse(p.imagesJson) as string[])[0] || '',
        unitPrice: Number(p.unitPrice),
        currency: p.baseCurrency || 'USD',
        poolProgress: p.pool ? Math.floor((p.pool.pledgedQty / p.pool.targetQty) * 100) : 0,
      }))}
    />
  );
}
