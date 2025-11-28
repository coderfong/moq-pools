/**
 * Debug pool data to see what's available
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPool() {
  const poolId = process.argv[2] || 'cmh3ff4vr02gzp39bxeqroofa';
  
  console.log(`Debugging pool: ${poolId}\n`);
  
  try {
    // Get pool with all related data
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: { 
        product: { 
          include: { 
            supplier: true 
          } 
        } 
      },
    });
    
    if (!pool) {
      console.log('❌ Pool not found');
      return;
    }
    
    console.log('=== POOL DATA ===');
    console.log(`ID: ${pool.id}`);
    console.log(`Product ID: ${pool.productId}`);
    console.log(`Status: ${pool.status}`);
    console.log(`Target Qty: ${pool.targetQty}`);
    console.log(`Pledged Qty: ${pool.pledgedQty}`);
    
    console.log('\n=== PRODUCT DATA ===');
    if (pool.product) {
      console.log(`ID: ${pool.product.id}`);
      console.log(`Title: ${pool.product.title || 'NULL'}`);
      console.log(`Source URL: ${pool.product.sourceUrl || 'NULL'}`);
      console.log(`Unit Price: ${pool.product.unitPrice || 'NULL'}`);
      console.log(`Base Currency: ${pool.product.baseCurrency || 'NULL'}`);
      console.log(`MOQ Qty: ${pool.product.moqQty || 'NULL'}`);
      console.log(`Images JSON: ${pool.product.imagesJson ? pool.product.imagesJson.substring(0, 100) + '...' : 'NULL'}`);
      
      if (pool.product.supplier) {
        console.log('\n=== SUPPLIER DATA ===');
        console.log(`Name: ${pool.product.supplier.name || 'NULL'}`);
      }
    } else {
      console.log('No product data found!');
    }
    
    // Check SavedListing if sourceUrl exists
    if (pool.product?.sourceUrl) {
      console.log('\n=== SAVED LISTING DATA ===');
      const listing = await prisma.savedListing.findUnique({
        where: { url: pool.product.sourceUrl },
        select: {
          id: true,
          url: true,
          title: true,
          image: true,
          priceRaw: true,
          platform: true,
        }
      });
      
      if (listing) {
        console.log(`ID: ${listing.id}`);
        console.log(`Title: ${listing.title}`);
        console.log(`Image: ${listing.image || 'NULL'}`);
        console.log(`Price Raw: ${listing.priceRaw || 'NULL'}`);
        console.log(`Platform: ${listing.platform}`);
        console.log(`URL: ${listing.url}`);
      } else {
        console.log('❌ No SavedListing found for this sourceUrl');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPool();
