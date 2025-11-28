/**
 * List all pools in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPools() {
  try {
    const pools = await prisma.pool.findMany({
      include: { 
        product: { 
          select: {
            id: true,
            title: true,
            sourceUrl: true,
          }
        } 
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (pools.length === 0) {
      console.log('❌ No pools found in database');
      return;
    }
    
    console.log(`Found ${pools.length} pools:\n`);
    
    pools.forEach((pool, i) => {
      console.log(`${i + 1}. Pool ID: ${pool.id}`);
      console.log(`   Product: ${pool.product?.title || 'No title'}`);
      console.log(`   Status: ${pool.status}`);
      console.log(`   Target: ${pool.targetQty}, Pledged: ${pool.pledgedQty}`);
      console.log(`   Checkout URL: http://localhost:3007/checkout?poolId=${pool.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPools();
