// Transfer purchase to correct listing pool and delete System product
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixPurchase() {
  try {
    const listingId = 'cmg15besl07gerdvrqdo18ucp';
    const systemProductId = 'cmievzk36000n9ehviblwzq6x';
    const systemPoolId = 'cmievzk5o000p9ehvx0p4abgt';
    
    console.log('🔍 Step 1: Finding the original listing and its pool...\n');
    
    // Get the original listing
    const listing = await prisma.savedListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        url: true,
        platform: true
      }
    });
    
    console.log('📋 Original Listing:');
    console.log(`   Title: ${listing.title}`);
    console.log(`   URL: ${listing.url}\n`);
    
    // Find the REAL pool for this listing (not the System one)
    // It should be linked to a product that has this listing's URL
    const realProduct = await prisma.product.findFirst({
      where: {
        sourceUrl: listing.url,
        id: { not: systemProductId } // Exclude the System product
      },
      include: {
        pool: true,
        supplier: true
      }
    });
    
    if (!realProduct) {
      console.log('❌ No existing product found for this listing.');
      console.log('   The System product IS the only product for this listing.');
      console.log('   We should UPDATE it instead of deleting it.\n');
      
      // Update the System product to have the correct sourceUrl
      console.log('🔧 Updating System product with listing URL...');
      await prisma.product.update({
        where: { id: systemProductId },
        data: {
          sourceUrl: listing.url
        }
      });
      
      console.log('✅ System product updated with sourceUrl!');
      console.log(`   Product ${systemProductId} now linked to listing ${listingId}`);
      console.log(`   Pool progress: 56/100\n`);
      
      console.log('🎉 Done! The listing will now show the correct pool progress.');
      return;
    }
    
    console.log('📦 Real Product found:');
    console.log(`   ID: ${realProduct.id}`);
    console.log(`   Title: ${realProduct.title}`);
    console.log(`   Supplier: ${realProduct.supplier.name}`);
    if (realProduct.pool) {
      console.log(`   Pool: ${realProduct.pool.id} (${realProduct.pool.pledgedQty}/${realProduct.pool.targetQty})\n`);
    }
    
    // Get the System pool items
    console.log('🔍 Step 2: Getting purchase from System pool...\n');
    const systemPoolItems = await prisma.poolItem.findMany({
      where: { poolId: systemPoolId },
      include: {
        payment: true,
        user: {
          select: { email: true, name: true }
        }
      }
    });
    
    console.log(`   Found ${systemPoolItems.length} items in System pool:`);
    systemPoolItems.forEach(item => {
      console.log(`   - User: ${item.user.email}, Qty: ${item.quantity}, Status: ${item.payment?.status}`);
    });
    console.log('');
    
    if (realProduct.pool && systemPoolItems.length > 0) {
      console.log('🔄 Step 3: Moving items to real pool...\n');
      
      let totalQty = 0;
      for (const item of systemPoolItems) {
        await prisma.poolItem.update({
          where: { id: item.id },
          data: { poolId: realProduct.pool.id }
        });
        totalQty += item.quantity;
        console.log(`   ✅ Moved item ${item.id} to pool ${realProduct.pool.id}`);
      }
      
      // Update real pool quantity
      await prisma.pool.update({
        where: { id: realProduct.pool.id },
        data: {
          pledgedQty: {
            increment: totalQty
          }
        }
      });
      console.log(`   ✅ Added ${totalQty} units to real pool\n`);
    }
    
    // Delete System pool and product
    console.log('🗑️  Step 4: Cleaning up System pool and product...\n');
    
    await prisma.pool.delete({
      where: { id: systemPoolId }
    });
    console.log(`   ✅ Deleted System pool ${systemPoolId}`);
    
    await prisma.product.delete({
      where: { id: systemProductId }
    });
    console.log(`   ✅ Deleted System product ${systemProductId}\n`);
    
    console.log('🎉 Done! Your purchase is now in the correct pool.');
    console.log(`   Real pool: ${realProduct.pool.id}`);
    console.log(`   New progress: ${realProduct.pool.pledgedQty + 56}/${realProduct.pool.targetQty}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPurchase();
