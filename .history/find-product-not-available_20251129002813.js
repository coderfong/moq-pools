const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProductNotAvailable() {
  try {
    console.log('🔍 Searching for "Product Not Available" listings...\n');
    
    // Search for exact match
    const exactResults = await prisma.savedListing.findMany({
      where: {
        title: {
          equals: 'Product Not Available',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        platform: true,
        url: true,
        createdAt: true
      },
      take: 20
    });
    
    console.log(`📊 Found ${exactResults.length} listings with exact title "Product Not Available":`);
    exactResults.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.platform}] ${r.title}`);
      console.log(`     URL: ${r.url}`);
      console.log(`     ID: ${r.id}`);
      console.log();
    });
    
    // Get total count for exact matches
    const totalExactCount = await prisma.savedListing.count({
      where: {
        title: {
          equals: 'Product Not Available',
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`\n📈 Total exact "Product Not Available" listings: ${totalExactCount}`);
    
    // Also search for similar patterns including exact "Product Not Available"
    const similarResults = await prisma.savedListing.findMany({
      where: {
        OR: [
          { title: { equals: 'Product Not Available', mode: 'insensitive' } },
          { title: { contains: 'not available', mode: 'insensitive' } },
          { title: { contains: 'unavailable', mode: 'insensitive' } },
          { title: { contains: 'product not', mode: 'insensitive' } },
          { title: { equals: 'Product', mode: 'insensitive' } }
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
    
    console.log(`\n📋 Similar "unavailable" patterns found (${similarResults.length} samples):`);
    similarResults.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.platform}] "${r.title}" (ID: ${r.id})`);
      if (r.url) console.log(`      URL: ${r.url}`);
    });
    
    const totalSimilarCount = await prisma.savedListing.count({
      where: {
        OR: [
          { title: { contains: 'not available', mode: 'insensitive' } },
          { title: { contains: 'unavailable', mode: 'insensitive' } },
          { title: { contains: 'product not', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`\n📈 Total similar "unavailable" listings: ${totalSimilarCount}`);
    
    if (totalExactCount > 0) {
      console.log('\n💡 To remove the exact "Product Not Available" listings, you can run:');
      console.log('   node find-product-not-available.js --delete');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteProductNotAvailable() {
  try {
    console.log('🗑️ Deleting "Product Not Available" listings...\n');
    
    const deleteResult = await prisma.savedListing.deleteMany({
      where: {
        title: {
          equals: 'Product Not Available',
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`✅ Successfully deleted ${deleteResult.count} "Product Not Available" listings!`);
    
    // Show updated total count
    const remainingCount = await prisma.savedListing.count();
    console.log(`📊 Remaining total listings: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const shouldDelete = process.argv.includes('--delete');

if (shouldDelete) {
  deleteProductNotAvailable().catch(console.error);
} else {
  findProductNotAvailable().catch(console.error);
}