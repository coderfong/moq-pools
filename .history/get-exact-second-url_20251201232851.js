const crypto = require('crypto');
const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function getExactUrl() {
  const prisma = new PrismaClient();
  
  try {
    const listing = await prisma.savedListing.findFirst({
      where: {
        image: { contains: 'cd5cf41e57f830841012f9673a557f4174a58a78' }
      },
      select: { detailJson: true }
    });
    
    if (listing && listing.detailJson && listing.detailJson.gallery) {
      const secondImg = listing.detailJson.gallery[1];
      console.log('\nSecond gallery image:');
      console.log(JSON.stringify(secondImg, null, 2));
      
      const url = typeof secondImg === 'string' ? secondImg : secondImg?.url || secondImg?.src;
      if (url) {
        let normalized = url.startsWith('//') ? `https:${url}` : url;
        if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
        
        const hash = crypto.createHash('sha1').update(normalized).digest('hex');
        console.log('\nNormalized URL:', normalized);
        console.log('Hash:', hash);
        
        // Check dimensions from URL
        const dimMatch = normalized.match(/tps-(\d+)-(\d+)/i);
        if (dimMatch) {
          console.log(`Dimensions: ${dimMatch[1]}x${dimMatch[2]}`);
          const width = parseInt(dimMatch[1]);
          const height = parseInt(dimMatch[2]);
          
          if (width >= 900 && height <= 200) {
            console.log('⚠️  This is a BANNER (wide and short)!');
          } else if (width === 600 && height === 600) {
            console.log('⚠️  This is the 600x600 PLACEHOLDER!');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getExactUrl();
