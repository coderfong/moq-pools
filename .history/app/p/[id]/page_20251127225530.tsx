import { prisma } from '@/lib/prisma';
import { permanentRedirect } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export default async function ProductPage({ params }: { params: { id: string }}) {
  if (!prisma) return <div className="px-6 py-8 text-center">Database unavailable</div>;
  
  // Check if this is a Product ID - redirect to the pool page via SavedListing
  const product = await prisma.product.findUnique({ 
    where: { id: params.id }, 
    select: { sourceUrl: true }
  });
  
  if (product?.sourceUrl) {
    // Find the SavedListing for this product's source URL
    const savedListing = await prisma.savedListing.findFirst({
      where: { url: product.sourceUrl },
      select: { id: true }
    });
    
    if (savedListing) {
      permanentRedirect(`/pools/${savedListing.id}`);
    }
  }
  
  // Check if this is a Pool ID - redirect to the pool page via SavedListing
  const pool = await prisma.pool.findUnique({ 
    where: { id: params.id }, 
    select: { product: { select: { sourceUrl: true } } }
  });
  
  if (pool?.product?.sourceUrl) {
    const savedListing = await prisma.savedListing.findFirst({
      where: { url: pool.product.sourceUrl },
      select: { id: true }
    });
    
    if (savedListing) {
      permanentRedirect(`/pools/${savedListing.id}`);
    }
  }
  
  return <div className="px-6 py-8 text-center">Pool not found</div>;
  
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
