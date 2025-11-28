/**
 * Get a Made-in-China URL from the database to test with
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestUrl() {
  try {
    // Get a Made-in-China listing that was recently updated (likely has good data)
    const listing = await prisma.savedListing.findFirst({
      where: {
        url: {
          contains: 'made-in-china.com'
        },
        title: {
          not: {
            matches: '^\\d+\\s*/\\s*\\d+$' // Not a broken title like "1/ 6"
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (!listing) {
      console.log('❌ No Made-in-China listings found in database');
      console.log('\nTry searching for products first:');
      console.log('pnpm tsx scripts/findMadeInChinaTestUrl.ts');
      return;
    }
    
    console.log('✅ Found test listing:\n');
    console.log(`Title: ${listing.title}`);
    console.log(`URL: ${listing.url}`);
    console.log(`Price: ${listing.priceRaw || 'N/A'}`);
    console.log(`Image: ${listing.image || 'N/A'}`);
    console.log(`\nTest with this URL:`);
    console.log(`pnpm tsx scripts/testMadeInChinaSingleProduct.ts "${listing.url}"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestUrl();
