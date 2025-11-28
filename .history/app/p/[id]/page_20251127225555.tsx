import { prisma } from '@/lib/prisma';
import { permanentRedirect } from 'next/navigation';

/**
 * Legacy /p/[id] route - redirects to /pools/[savedListingId]
 * This handles old product and pool ID links
 */
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
  const poolData = await prisma.pool.findUnique({ 
    where: { id: params.id }, 
    select: { product: { select: { sourceUrl: true } } }
  });
  
  if (poolData?.product?.sourceUrl) {
    const savedListing = await prisma.savedListing.findFirst({
      where: { url: poolData.product.sourceUrl },
      select: { id: true }
    });
    
    if (savedListing) {
      permanentRedirect(`/pools/${savedListing.id}`);
    }
  }
  
  // If nothing found, redirect to products page
  permanentRedirect('/products');
  
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
