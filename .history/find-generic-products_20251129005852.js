const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findGenericProducts() {
  try {
    console.log('🔍 Searching for generic "Product" titles...\n');
    
    const results = await prisma.savedListing.findMany({
      where: {
        OR: [
          { title: { equals: 'Product', mode: 'insensitive' } },
          { title: { in: ['Product', 'product', 'PRODUCT'] } }
        ]
      },
      select: {
        id: true,
        title: true,
        platform: true,
        url: true
      },
      take: 20
    });
    
    console.log(`Found ${results.length} listings with generic "Product" title:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.platform}] "${r.title}" (ID: ${r.id})`);
      console.log(`     URL: ${r.url}`);
      console.log();
    });
    
    // Get total count
    const totalCount = await prisma.savedListing.count({
      where: {
        OR: [
          { title: { equals: 'Product', mode: 'insensitive' } },
          { title: { in: ['Product', 'product', 'PRODUCT'] } }
        ]
      }
    });
    
    console.log(`Total generic "Product" listings: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findGenericProducts();