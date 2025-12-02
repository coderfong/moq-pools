const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function findBadImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Searching for bad R2 images...\n');
    
    // Known bad image hashes
    const badHashes = [
      '4e70cc58277297de2d4741c437c9dc425c4f8adb',
      'e7cc244e1d0f558ae9669f57b973758bc14103ee',
    ];
    
    console.log('Checking for known bad hashes...\n');
    
    for (const hash of badHashes) {
      const count = await prisma.savedListing.count({
        where: {
          platform: 'ALIBABA',
          image: { contains: hash }
        }
      });
      
      console.log(`   Hash ${hash.substring(0, 12)}...: ${count} listings`);
      
      if (count > 0) {
        const samples = await prisma.savedListing.findMany({
          where: {
            platform: 'ALIBABA',
            image: { contains: hash }
          },
          select: { 
            id: true, 
            title: true, 
            image: true,
            detailJson: true 
          },
          take: 3
        });
        
        samples.forEach((s, i) => {
          console.log(`     ${i + 1}. ${s.title.substring(0, 50)}...`);
          console.log(`        Image: ${s.image}`);
          console.log(`        Gallery images: ${s.detailJson?.gallery?.length || 0}`);
          if (s.detailJson?.gallery && s.detailJson.gallery.length > 0) {
            console.log(`        Alternative: ${s.detailJson.gallery[0]}`);
          }
        });
        console.log('');
      }
    }
    
    // Also check for small dimension patterns that might be bad
    console.log('\nChecking for potentially bad image patterns...\n');
    
    const suspiciousPatterns = [
      { pattern: '/tps-', name: 'TPS pattern (often small icons)' },
      { pattern: '_80x80', name: 'Thumbnail 80x80' },
      { pattern: '_50x50', name: 'Thumbnail 50x50' },
      { pattern: '_100x100', name: 'Thumbnail 100x100' },
    ];
    
    for (const { pattern, name } of suspiciousPatterns) {
      // We need to check the original URL that was cached
      // Let's look at detailJson to see what URLs were used
      const listings = await prisma.savedListing.findMany({
        where: {
          platform: 'ALIBABA',
          image: { startsWith: R2_PUBLIC_URL },
          detailJson: { not: null }
        },
        select: {
          id: true,
          title: true,
          image: true,
          detailJson: true
        },
        take: 100
      });
      
      let patternCount = 0;
      const patternSamples = [];
      
      for (const listing of listings) {
        // Check if gallery has the pattern
        if (listing.detailJson?.gallery) {
          const hasPattern = listing.detailJson.gallery.some(url => 
            typeof url === 'string' && url.includes(pattern)
          );
          
          if (hasPattern) {
            patternCount++;
            if (patternSamples.length < 2) {
              patternSamples.push({
                title: listing.title,
                gallery: listing.detailJson.gallery
              });
            }
          }
        }
      }
      
      if (patternCount > 0) {
        console.log(`   ${name}: Found in ~${patternCount} galleries (sample of 100)`);
        if (patternSamples.length > 0) {
          patternSamples[0].gallery.slice(0, 2).forEach(url => {
            console.log(`      ${url}`);
          });
        }
        console.log('');
      }
    }
    
    // Summary
    console.log('\n📊 Summary\n');
    const total = await prisma.savedListing.count({
      where: { platform: 'ALIBABA', image: { startsWith: R2_PUBLIC_URL } }
    });
    console.log(`   Total R2 images: ${total}`);
    
    const totalBad = badHashes.reduce(async (acc, hash) => {
      const count = await prisma.savedListing.count({
        where: { platform: 'ALIBABA', image: { contains: hash } }
      });
      return (await acc) + count;
    }, Promise.resolve(0));
    
    console.log(`   Known bad images: ${await totalBad}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findBadImages();
