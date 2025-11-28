/**
 * Find Made-in-China products with price tier information
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPriceTierProducts() {
  try {
    // Look for products with price ranges (indicating tiers)
    const products = await prisma.savedListing.findMany({
      where: {
        url: { contains: 'made-in-china.com' },
        priceRaw: {
          contains: '-' // Price range like "US$7.98 - 9.16"
        }
      },
      select: {
        id: true,
        url: true,
        title: true,
        priceRaw: true,
      },
      take: 10,
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (products.length === 0) {
      console.log('❌ No products with price ranges found');
      return;
    }
    
    console.log(`✅ Found ${products.length} products with price ranges:\n`);
    
    products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.title.substring(0, 60)}...`);
      console.log(`   Price: ${product.priceRaw}`);
      console.log(`   URL: ${product.url}`);
      console.log('');
    });
    
    console.log('\nTest with:');
    console.log(`pnpm tsx scripts/inspectMadeInChinaPriceTiers.ts "${products[0].url}"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPriceTierProducts();
