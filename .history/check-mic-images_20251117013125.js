const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Count total Made in China listings
    const total = await prisma.savedListing.count({
      where: { platform: 'MADE_IN_CHINA' }
    });
    
    // Count listings with no image
    const noImage = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    // Count listings with /seed/ placeholder images
    const seedImages = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: '/seed/' }
      }
    });
    
    // Count listings with /cache/ images
    const cachedImages = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: '/cache/' }
      }
    });
    
    // Count listings with external (http) images
    const externalImages = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      }
    });
    
    console.log('\n=== Made in China Image Status ===');
    console.log(`Total listings: ${total}`);
    console.log(`No image (null/empty): ${noImage} (${((noImage/total)*100).toFixed(1)}%)`);
    console.log(`Placeholder (/seed/): ${seedImages} (${((seedImages/total)*100).toFixed(1)}%)`);
    console.log(`Cached locally (/cache/): ${cachedImages} (${((cachedImages/total)*100).toFixed(1)}%)`);
    console.log(`External (http): ${externalImages} (${((externalImages/total)*100).toFixed(1)}%)`);
    console.log(`Missing thumbnails: ${noImage + seedImages} (${(((noImage + seedImages)/total)*100).toFixed(1)}%)`);
    
    // Sample 10 listings with missing images
    console.log('\n=== Sample Listings with Missing Images ===');
    const samples = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        OR: [
          { image: null },
          { image: '' },
          { image: { startsWith: '/seed/' } }
        ]
      },
      take: 10,
      select: { id: true, title: true, image: true, url: true }
    });
    
    samples.forEach((s, idx) => {
      console.log(`\n${idx + 1}. ${s.title.slice(0, 60)}`);
      console.log(`   Image: ${s.image || '(none)'}`);
      console.log(`   URL: ${s.url}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
