// Find and link the product
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixLink() {
  try {
    const listingId = 'cmg15besl07gerdvrqdo18ucp';
    
    // Get the listing
    const listing = await prisma.savedListing.findUnique({
      where: { id: listingId }
    });
    
    console.log('📋 Listing:', listing.title);
    console.log('   URL:', listing.url);
    
    // Get the System product (there should only be one recent one)
    const product = await prisma.product.findFirst({
      where: {
        supplier: {
          name: 'System'
        }
      },
      include: {
        pool: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n📦 Product:', product.title);
    console.log('   ID:', product.id);
    console.log('   Pool:', `${product.pool.pledgedQty}/${product.pool.targetQty}`);
    
    // Update it
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        sourceUrl: listing.url,
        title: listing.title, // Also update title to match
      }
    });
    
    console.log('\n✅ Updated product!');
    console.log('   Title:', updated.title);
    console.log('   sourceUrl:', updated.sourceUrl);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLink();
