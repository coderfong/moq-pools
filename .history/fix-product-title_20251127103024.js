const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixProductTitle() {
  console.log('\n=== Fixing Product Title ===\n');
  
  // Get the correct listing info
  const listing = await prisma.savedListing.findUnique({
    where: { id: 'cmg15besl07gerdvrqdo18ucp' },
    select: { id: true, title: true, url: true }
  });
  
  console.log('Correct Listing Info:');
  console.log('  ID:', listing.id);
  console.log('  Title:', listing.title);
  console.log('  URL:', listing.url);
  
  // Update the product
  const updated = await prisma.product.update({
    where: { id: 'cmievzk36000n9ehviblwzq6x' },
    data: {
      title: listing.title
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
  console.log('\n✓ Product title fixed!');
  
  await prisma.$disconnect();
}

fixProductTitle().catch(console.error);
