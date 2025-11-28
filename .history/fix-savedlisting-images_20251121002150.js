// Fix SavedListings with invalid image data (just "jpg", "png", etc. instead of proper URLs)
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  console.log('Finding SavedListings with invalid images...');
  
  // Find listings with just file extensions as images
  const invalidExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
  const listings = await prisma.savedListing.findMany({
    where: {
      OR: invalidExtensions.map(ext => ({ image: ext }))
    },
    select: {
      id: true,
      title: true,
      image: true,
      url: true,
    }
  });
  
  console.log(`Found ${listings.length} SavedListings with invalid images`);
  
  if (listings.length === 0) {
    console.log('No invalid images found. Checking for other patterns...');
    
    // Check for images that might be malformed
    const allListings = await prisma.savedListing.findMany({
      select: { id: true, title: true, image: true, url: true },
      take: 20
    });
    
    console.log('\nSample of first 20 SavedListings:');
    allListings.forEach(l => {
      console.log(`  ${l.id}: image="${l.image}" (${l.image?.length || 0} chars)`);
    });
    
    return;
  }
  
  let fixed = 0;
  
  for (const listing of listings) {
    try {
      console.log(`Fixing ${listing.id}: "${listing.title}" - image: "${listing.image}"`);
      
      // Set to empty string to use fallback
      await prisma.savedListing.update({
        where: { id: listing.id },
        data: { image: '' }
      });
      
      fixed++;
    } catch (err) {
      console.error(`Error fixing listing ${listing.id}:`, err.message);
    }
  }
  
  console.log(`\nComplete! Fixed: ${fixed} SavedListings`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
