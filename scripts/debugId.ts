/**
 * Debug what cmh3ff4vr02gzp39bxeqroofa actually is
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugId() {
  const id = 'cmh3ff4vr02gzp39bxeqroofa';
  
  console.log(`Checking what ${id} is...\n`);
  
  try {
    // Check if it's a SavedListing
    const listing = await prisma.savedListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        image: true,
        priceRaw: true,
        platform: true,
      }
    });
    
    if (listing) {
      console.log('✅ Found SavedListing:');
      console.log(`   Title: ${listing.title}`);
      console.log(`   Platform: ${listing.platform}`);
      console.log(`   Price: ${listing.priceRaw || 'N/A'}`);
      console.log(`   Image: ${listing.image || 'N/A'}`);
      console.log(`   URL: ${listing.url}`);
      console.log(`\n   Pool page: http://localhost:3007/pools/${id}`);
      
      // Check if there's a pool for this listing
      const pool = await prisma.pool.findFirst({
        where: {
          product: {
            sourceUrl: listing.url
          }
        },
        select: {
          id: true,
          targetQty: true,
          pledgedQty: true,
        }
      });
      
      if (pool) {
        console.log(`\n✅ Found related Pool:`);
        console.log(`   Pool ID: ${pool.id}`);
        console.log(`   Target: ${pool.targetQty}, Pledged: ${pool.pledgedQty}`);
        console.log(`   Checkout: http://localhost:3007/checkout?poolId=${pool.id}`);
      } else {
        console.log(`\n❌ No Pool found for this listing`);
      }
      
      return;
    }
    
    // Check if it's a Pool
    const pool = await prisma.pool.findUnique({
      where: { id },
    });
    
    if (pool) {
      console.log('✅ Found Pool:');
      console.log(`   Pool ID: ${pool.id}`);
      console.log(`   Product ID: ${pool.productId}`);
      return;
    }
    
    console.log('❌ Not found as SavedListing or Pool');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugId();
