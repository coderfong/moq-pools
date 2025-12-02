const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function checkNoImageListings() {
  const prisma = new PrismaClient();
  
  try {
    // Get some listings with null images
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { not: null }
      },
      select: { id: true, title: true, detailJson: true },
      take: 10
    });
    
    console.log(`\n📋 Checking ${listings.length} listings with no images:\n`);
    
    listings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
      
      if (listing.detailJson) {
        const gallery = listing.detailJson.gallery || [];
        const imageList = listing.detailJson.imageList || [];
        const images = listing.detailJson.images || [];
        
        console.log(`   Gallery: ${gallery.length} images`);
        console.log(`   ImageList: ${imageList.length} images`);
        console.log(`   Images: ${images.length} images`);
        
        if (gallery.length > 0) {
          console.log(`   First 3 gallery items:`);
          gallery.slice(0, 3).forEach((img, idx) => {
            const url = typeof img === 'string' ? img : img?.url || img?.src;
            if (url) {
              const normalized = url.startsWith('//') ? `https:${url}` : url.startsWith('http') ? url : `https://${url}`;
              console.log(`     [${idx}] ${normalized}`);
              
              // Check dimensions
              const dimMatch = normalized.match(/tps-(\d+)-(\d+)/i);
              if (dimMatch) {
                const w = parseInt(dimMatch[1]);
                const h = parseInt(dimMatch[2]);
                const ratio = (w / h).toFixed(2);
                console.log(`         Dimensions: ${w}x${h}, aspect: ${ratio}`);
              }
            }
          });
        }
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNoImageListings();
