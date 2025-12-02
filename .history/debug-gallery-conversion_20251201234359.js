const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function debugGalleryConversion() {
  const prisma = new PrismaClient();
  
  try {
    const listing = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        OR: [{ image: null }, { image: '' }],
        detailJson: { not: null }
      },
      select: { id: true, title: true, detailJson: true }
    });
    
    console.log(`\n📋 Testing: ${listing.title}\n`);
    
    const gallery = listing.detailJson.gallery || [];
    console.log(`Gallery length: ${gallery.length}\n`);
    
    gallery.slice(0, 5).forEach((img, idx) => {
      let url = typeof img === 'string' ? img : img?.url || img?.src;
      console.log(`[${idx}] Original: ${url}`);
      
      if (url) {
        // Normalize
        if (url.startsWith('//')) url = `https:${url}`;
        if (!url.startsWith('http')) url = `https://${url}`;
        console.log(`    Normalized: ${url}`);
        
        // Remove thumbnail suffix
        const thumbnailMatch = url.match(/^(.+)\.(jpg|jpeg|png|webp|gif)_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i);
        if (thumbnailMatch) {
          url = `${thumbnailMatch[1]}.${thumbnailMatch[2]}`;
        } else {
          url = url.replace(/_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i, '.$1');
        }
        console.log(`    Full-size: ${url}`);
        
        // Check dimensions
        const dimMatch = url.match(/tps-(\d+)-(\d+)/i);
        if (dimMatch) {
          console.log(`    Dimensions: ${dimMatch[1]}x${dimMatch[2]}`);
        } else {
          console.log(`    No tps dimensions found`);
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

debugGalleryConversion();
