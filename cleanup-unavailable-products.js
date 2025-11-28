const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUnavailableProducts() {
  console.log('🔍 Scanning for unavailable products...\n');

  try {
    // Keywords that indicate a product is no longer available
    const unavailableKeywords = [
      'product not available',
      'not available',
      'unavailable',
      'page not found',
      '404 not found',
      'removed',
      'deleted',
      'discontinued',
      'out of stock permanently',
      'no longer available',
      'item not found',
      'listing removed',
      'access denied',
      'forbidden',
      'expired listing',
      'invalid product',
      'broken link'
    ];

    // Find potentially unavailable listings
    const allListings = await prisma.savedListing.findMany({
      select: {
        id: true,
        title: true,
        url: true,
        platform: true,
        createdAt: true
      }
    });

    console.log(`📊 Total listings: ${allListings.length}`);

    const unavailableListings = [];
    
    for (const listing of allListings) {
      const title = (listing.title || '').toLowerCase();
      const shouldRemove = unavailableKeywords.some(keyword => 
        title.includes(keyword.toLowerCase())
      );
      
      if (shouldRemove) {
        unavailableListings.push(listing);
      }
    }

    console.log(`\n🚨 Found ${unavailableListings.length} unavailable products:`);
    
    // Display first 20 for review
    unavailableListings.slice(0, 20).forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.platform}] "${item.title}" (ID: ${item.id})`);
    });

    if (unavailableListings.length > 20) {
      console.log(`  ... and ${unavailableListings.length - 20} more`);
    }

    if (unavailableListings.length === 0) {
      console.log('✅ No unavailable products found!');
      return;
    }

    // Ask for confirmation
    const confirmed = process.argv.includes('--confirm');
    if (!confirmed) {
      console.log('\n❓ To remove these listings, run with --confirm flag:');
      console.log('   node cleanup-unavailable-products.js --confirm');
      return;
    }

    console.log('\n🗑️ Removing unavailable products...');

    // Remove the listings
    const deleteResult = await prisma.savedListing.deleteMany({
      where: {
        id: {
          in: unavailableListings.map(item => item.id)
        }
      }
    });

    console.log(`✅ Successfully removed ${deleteResult.count} unavailable products!`);

    // Show updated counts
    const remainingCount = await prisma.savedListing.count();
    console.log(`📊 Remaining listings: ${remainingCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUnavailableProducts().catch(console.error);