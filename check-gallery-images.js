const crypto = require('crypto');
const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function checkSecondImage() {
  const prisma = new PrismaClient();
  
  try {
    const targetHash = 'cd5cf41e57f830841012f9673a557f4174a58a78';
    
    const listings = await prisma.savedListing.findMany({
      where: {
        image: { contains: targetHash }
      },
      select: { id: true, title: true, detailJson: true },
      take: 3
    });
    
    console.log(`\nChecking second gallery image for ${listings.length} listings:\n`);
    
    listings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title.substring(0, 50)}...`);
      
      if (listing.detailJson) {
        const gallery = listing.detailJson.gallery || listing.detailJson.imageList || [];
        
        console.log(`   Gallery length: ${gallery.length}`);
        
        gallery.forEach((img, idx) => {
          const url = typeof img === 'string' ? img : img?.url || img?.src;
          if (url) {
            let normalized = url.startsWith('//') ? `https:${url}` : url;
            if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
            
            const hash = crypto.createHash('sha1').update(normalized).digest('hex');
            const match = hash === targetHash ? ' ⚠️  TARGET HASH!' : '';
            
            console.log(`   [${idx}] ${normalized.substring(0, 80)}...`);
            console.log(`       Hash: ${hash}${match}`);
          }
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSecondImage();
