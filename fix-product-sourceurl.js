const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixProductSourceUrl() {
  console.log('\n=== Fixing Product sourceUrl ===\n');
  
  // Get the correct listing info (Batter Dispenser)
  const correctListing = await prisma.savedListing.findUnique({
    where: { id: 'cmg13wyz105uerdvr44gguwga' },
    select: { id: true, title: true, url: true }
  });
  
  console.log('Correct Listing (what user actually purchased):');
  console.log('  ID:', correctListing.id);
  console.log('  Title:', correctListing.title);
  console.log('  URL:', correctListing.url);
  
  // Get current product state
  const currentProduct = await prisma.product.findUnique({
    where: { id: 'cmievzk36000n9ehviblwzq6x' },
    select: {
      id: true,
      title: true,
      sourceUrl: true
    }
  });
  
  console.log('\nCurrent Product State:');
  console.log('  ID:', currentProduct.id);
  console.log('  Title:', currentProduct.title);
  console.log('  sourceUrl:', currentProduct.sourceUrl);
  
  // Update the product with correct URL
  const updated = await prisma.product.update({
    where: { id: 'cmievzk36000n9ehviblwzq6x' },
    data: {
      sourceUrl: correctListing.url
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true
    }
  });
  
  console.log('\nUpdated Product:');
  console.log('  ID:', updated.id);
  console.log('  Title:', updated.title);
  console.log('  sourceUrl:', updated.sourceUrl);
  console.log('\n✓ Product sourceUrl fixed! Pool progress will now show on the correct listing.');
  
  await prisma.$disconnect();
}

fixProductSourceUrl().catch(console.error);
