const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function findProduct() {
  try {
    const searchTerm = '2025 New Lanyard Webbing Snap Button';
    
    console.log(`Searching for: "${searchTerm}"\n`);
    
    const listings = await prisma.savedListing.findMany({
      where: {
        title: {
          contains: 'Lanyard Webbing Snap Button',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        platform: true,
        priceRaw: true,
        url: true,
        detailJson: true,
        detailUpdatedAt: true
      }
    });

    if (listings.length === 0) {
      console.log('❌ Product NOT found in database');
      
      // Try broader search
      console.log('\nTrying broader search for "Lanyard"...\n');
      const broader = await prisma.savedListing.findMany({
        where: {
          title: {
            contains: 'Lanyard',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          title: true,
          platform: true
        },
        take: 5
      });
      
      if (broader.length > 0) {
        console.log('Found these similar products:');
        broader.forEach((p, i) => {
          console.log(`${i + 1}. [${p.platform}] ${p.title}`);
        });
      }
    } else {
      console.log(`✅ Found ${listings.length} matching product(s):\n`);
      
      listings.forEach((listing, i) => {
        console.log(`${i + 1}. Title: ${listing.title}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Platform: ${listing.platform}`);
        console.log(`   Price: ${listing.priceRaw || 'N/A'}`);
        console.log(`   Has detailJson: ${listing.detailJson !== null ? 'YES' : 'NO'}`);
        console.log(`   Detail updated: ${listing.detailUpdatedAt || 'Never'}`);
        console.log(`   Pool URL: http://localhost:3007/pools/${listing.id}`);
        console.log(`   Source URL: ${listing.url}`);
        
        if (listing.detailJson) {
          const detail = listing.detailJson;
          console.log(`\n   Detail info:`);
          console.log(`   - Title: ${detail.title || 'N/A'}`);
          console.log(`   - Price Text: ${detail.priceText || 'N/A'}`);
          console.log(`   - MOQ Text: ${detail.moqText || 'N/A'}`);
          console.log(`   - Price Tiers: ${detail.priceTiers?.length || 0}`);
          console.log(`   - Attributes: ${detail.attributes?.length || 0}`);
          console.log(`   - Packaging: ${detail.packaging?.length || 0}`);
          console.log(`   - Supplier: ${detail.supplier?.name || 'N/A'}`);
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findProduct();
