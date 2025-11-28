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
}
