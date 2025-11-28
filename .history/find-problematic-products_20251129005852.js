const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProblematicProducts() {
  try {
    console.log('🔍 Searching for problematic Product titles...\n');
    
    // Check Product table for "Product Not Available" or generic titles
    const results = await prisma.product.findMany({
      where: {
        OR: [
          { title: { equals: 'Product Not Available', mode: 'insensitive' } },
          { title: { equals: 'Product', mode: 'insensitive' } },
          { title: { contains: 'not available', mode: 'insensitive' } },
          { title: { contains: 'unavailable', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        sourcePlatform: true,
        sourceUrl: true,
        pool: {
          select: {
            id: true,
            status: true
          }
        }
      },
      take: 20
    });
    
    console.log(`Found ${results.length} problematic products:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. "${r.title}" (ID: ${r.id})`);
      console.log(`     Platform: ${r.sourcePlatform}`);
      console.log(`     Active: ${r.isActive}`);
      console.log(`     Pool: ${r.pool ? `${r.pool.id} (${r.pool.status})` : 'None'}`);
      if (r.sourceUrl) console.log(`     Source URL: ${r.sourceUrl}`);
      console.log();
    });
    
    // Get total count
    const totalCount = await prisma.product.count({
      where: {
        OR: [
          { title: { equals: 'Product Not Available', mode: 'insensitive' } },
          { title: { equals: 'Product', mode: 'insensitive' } },
          { title: { contains: 'not available', mode: 'insensitive' } },
          { title: { contains: 'unavailable', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`Total problematic products: ${totalCount}`);
    
    // Also check for any products with very short titles
    const shortTitles = await prisma.product.findMany({
      where: {
        OR: [
          { title: { equals: '' } },
          { title: null }
        ]
      },
      select: {
        id: true,
        title: true,
        pool: {
          select: {
            id: true
          }
        }
      },
      take: 10
    });
    
    if (shortTitles.length > 0) {
      console.log(`\nFound ${shortTitles.length} products with empty/null titles:`);
      shortTitles.forEach((r, i) => {
        console.log(`  ${i + 1}. Title: "${r.title}" (ID: ${r.id}), Pool: ${r.pool?.id || 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findProblematicProducts();