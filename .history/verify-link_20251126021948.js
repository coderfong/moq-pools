// Verify the link is working
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function verifyLink() {
  try {
    const listingId = 'cmg15besl07gerdvrqdo18ucp';
    
    console.log('🔍 Checking listing...\n');
    const listing = await prisma.savedListing.findUnique({
      where: { id: listingId }
    });
    
    console.log('📋 Listing:');
    console.log(`   ID: ${listing.id}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   URL: ${listing.url}\n`);
    
    console.log('🔍 Finding product by listing URL...\n');
    const product = await prisma.product.findFirst({
      where: {
        sourceUrl: listing.url
      },
      include: {
        pool: {
          include: {
            items: {
              include: {
                user: {
                  select: { email: true }
                },
                payment: true
              }
            }
          }
        }
      }
    });
    
    if (!product) {
      console.log('❌ No product found with that URL!');
      console.log('   The URL might not match exactly.\n');
      
      // Check what URL the product actually has
      const systemProduct = await prisma.product.findUnique({
        where: { id: 'cmievzk36000n9ehviblwzq6x' },
        include: {
          pool: true
        }
      });
      
      console.log('📦 System Product:');
      console.log(`   sourceUrl: ${systemProduct.sourceUrl}`);
      console.log(`   listing.url: ${listing.url}`);
      console.log(`   Match: ${systemProduct.sourceUrl === listing.url}`);
      
      return;
    }
    
    console.log('✅ Product found:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Title: ${product.title}`);
    console.log(`   sourceUrl: ${product.sourceUrl}\n`);
    
    if (product.pool) {
      console.log('✅ Pool found:');
      console.log(`   ID: ${product.pool.id}`);
      console.log(`   Progress: ${product.pool.pledgedQty}/${product.pool.targetQty}`);
      console.log(`   Status: ${product.pool.status}`);
      console.log(`   Items: ${product.pool.items.length}\n`);
      
      if (product.pool.items.length > 0) {
        console.log('   Pool Items:');
        product.pool.items.forEach(item => {
          console.log(`   - ${item.user.email}: ${item.quantity} units (${item.payment?.status})`);
        });
      }
    } else {
      console.log('❌ No pool linked to product!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLink();
