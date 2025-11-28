// Link the auto-created product back to its source listing
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function linkProductToListing() {
  try {
    const listingId = 'cmg15besl07gerdvrqdo18ucp'; // From your log
    
    // Get the listing
    const listing = await prisma.savedListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        url: true,
        platform: true
      }
    });
    
    if (!listing) {
      console.log('❌ Listing not found');
      return;
    }
    
    console.log('📋 Listing found:');
    console.log(`   ID: ${listing.id}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   URL: ${listing.url}`);
    console.log(`   Platform: ${listing.platform}\n`);
    
    // Find the System product with matching title
    const product = await prisma.product.findFirst({
      where: {
        title: {
          contains: listing.title.split(' ').slice(0, 10).join(' ')
        },
        supplier: {
          name: 'System'
        }
      },
      include: {
        pool: true
      }
    });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log('📦 Product found:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Current sourceUrl: ${product.sourceUrl || 'null'}`);
    console.log(`   Pool: ${product.pool?.id} (${product.pool?.pledgedQty}/${product.pool?.targetQty})\n`);
    
    // Update the product with the listing's URL
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        sourceUrl: listing.url,
        sourcePlatform: listing.platform
      }
    });
    
    console.log('✅ Product updated!');
    console.log(`   New sourceUrl: ${updated.sourceUrl}`);
    console.log(`   Source platform: ${updated.sourcePlatform}\n`);
    
    console.log('🔗 The listing and product are now properly linked!');
    console.log('   When users buy from this listing, they will join the existing pool.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkProductToListing();
