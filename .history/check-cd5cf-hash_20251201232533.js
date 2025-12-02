const crypto = require('crypto');
const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function checkHash() {
  const prisma = new PrismaClient();
  
  try {
    const targetHash = 'cd5cf41e57f830841012f9673a557f4174a58a78';
    
    console.log(`\n🔍 Finding listings with hash: ${targetHash}\n`);
    
    const listings = await prisma.savedListing.findMany({
      where: {
        image: { contains: targetHash }
      },
      select: { id: true, title: true, image: true, detailJson: true },
      take: 5
    });
    
    console.log(`Found ${listings.length} listings with this hash\n`);
    
    listings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   Image: ${listing.image}`);
      
      if (listing.detailJson) {
        const gallery = listing.detailJson.gallery || listing.detailJson.imageList || [];
        console.log(`   Gallery has ${gallery.length} images`);
        
        if (gallery.length > 0) {
          console.log(`   First gallery image:`, gallery[0]);
          
          // Try to hash the first gallery image
          const firstImg = gallery[0];
          const url = typeof firstImg === 'string' ? firstImg : firstImg?.url || firstImg?.src;
          if (url) {
            let normalized = url.startsWith('//') ? `https:${url}` : url;
            if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
            
            const hash = crypto.createHash('sha1').update(normalized).digest('hex');
            console.log(`   Normalized: ${normalized}`);
            console.log(`   Hash: ${hash}.png`);
            
            if (hash === targetHash) {
              console.log(`   ⚠️  THIS IS THE BAD URL!`);
            }
          }
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

checkHash();
