import prisma from '@/lib/prisma';

async function checkFailingImageSizes() {
  // Get a sample of failed images (ones with external URLs)
  const failed = await prisma.savedListing.findMany({
    where: {
      sourcePlatform: 'made-in-china',
      imageUrl: {
        startsWith: 'http'
      }
    },
    take: 50,
    select: {
      imageUrl: true
    }
  });

  console.log(`Checking ${failed.length} external image URLs...`);
  
  const sizes: number[] = [];
  
  for (const listing of failed) {
    try {
      const response = await fetch(listing.imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/*,*/*;q=0.8',
        }
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const size = buffer.byteLength;
        sizes.push(size);
        
        if (size < 800) {
          console.log(`Size: ${size} bytes - ${listing.imageUrl}`);
        }
      }
    } catch (error) {
      // Skip failed fetches
    }
  }
  
  if (sizes.length > 0) {
    sizes.sort((a, b) => a - b);
    const min = sizes[0];
    const max = sizes[sizes.length - 1];
    const median = sizes[Math.floor(sizes.length / 2)];
    const under800 = sizes.filter(s => s < 800).length;
    const under600 = sizes.filter(s => s < 600).length;
    const under400 = sizes.filter(s => s < 400).length;
    
    console.log(`\n=== Size Statistics ===`);
    console.log(`Total checked: ${sizes.length}`);
    console.log(`Min: ${min} bytes`);
    console.log(`Max: ${max} bytes`);
    console.log(`Median: ${median} bytes`);
    console.log(`Under 800 bytes: ${under800} (${((under800/sizes.length)*100).toFixed(1)}%)`);
    console.log(`Under 600 bytes: ${under600} (${((under600/sizes.length)*100).toFixed(1)}%)`);
    console.log(`Under 400 bytes: ${under400} (${((under400/sizes.length)*100).toFixed(1)}%)`);
  }
}

checkFailingImageSizes()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
