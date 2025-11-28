/**
 * Test checkout page data retrieval logic
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCheckoutData() {
  const poolId = process.argv[2] || 'cmfyzwd2i0004kek8svbehxot';
  
  console.log(`Testing checkout data for pool: ${poolId}\n`);
  
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: { product: { include: { supplier: true } } },
    });
    
    if (!pool) {
      console.log('❌ Pool not found');
      return;
    }
    
    const title = pool?.product?.title || 'Selected product';
    const currency = pool?.product?.baseCurrency || 'USD';
    const unitPrice: number | null = pool?.product?.unitPrice ? Number(pool.product.unitPrice) : null;
    const moq = pool?.product?.moqQty || null;
    const sourceUrl: string | null = pool?.product?.sourceUrl || null;
    const supplierName: string | undefined = pool?.product?.supplier?.name;

    // Simulate the checkout page logic
    const { img, actualTitle, actualMoq, actualPrice, actualSupplier } = await (async () => {
      const js = pool?.product?.imagesJson;
      let imgFromJson: string | null = null;
      if (js) {
        try { 
          const arr = JSON.parse(js); 
          imgFromJson = Array.isArray(arr) && arr[0] ? String(arr[0]) : null; 
        } catch {}
      }
      
      // Default values from Product table
      const defaults = {
        img: imgFromJson,
        actualTitle: title,
        actualMoq: moq,
        actualPrice: unitPrice,
        actualSupplier: supplierName,
      };
      
      // Try to get enhanced details from SavedListing
      if (sourceUrl && prisma) {
        try {
          const listing = await prisma.savedListing.findUnique({
            where: { url: sourceUrl },
            select: { 
              image: true,
              title: true,
              priceRaw: true,
            }
          });
          
          if (listing) {
            // Use cached image if available and better than product image
            const finalImg = (listing.image && /^\/cache\//i.test(listing.image)) 
              ? listing.image 
              : imgFromJson;
            
            return {
              img: finalImg,
              actualTitle: listing.title || title,
              actualMoq: moq,
              actualPrice: unitPrice,
              actualSupplier: supplierName,
            };
          }
        } catch {}
      }
      
      // Return Product table data if SavedListing not found or query failed
      return defaults;
    })();
    
    console.log('=== CHECKOUT PAGE WILL DISPLAY ===\n');
    console.log(`Title: ${actualTitle}`);
    console.log(`Supplier: ${actualSupplier || '—'}`);
    console.log(`MOQ: ${actualMoq ? `≥${actualMoq}` : 'Varies'}`);
    console.log(`Price: ${actualPrice !== null ? `$${actualPrice}` : 'Contact supplier'} / unit`);
    console.log(`Currency: ${currency}`);
    console.log(`Image: ${img || '(no image)'}`);
    console.log(`\nCheckout URL: http://localhost:3007/checkout?poolId=${poolId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCheckoutData();
