import { prisma } from '../src/lib/prisma';

/**
 * Test actual sizes of "failed" Made-in-China images to understand if they're legitimate
 * 
 * Usage:
 *   pnpm tsx scripts/test-image-sizes.ts
 */

(async () => {
  if (!prisma) {
    console.error('ERROR: Prisma client not available. Check DATABASE_URL.');
    process.exit(1);
  }
  
  try {
    console.log('Testing sample Made-in-China image sizes...\n');
    
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      },
      select: { id: true, image: true, title: true },
      take: 50
    });
    
    console.log(`Testing ${listings.length} sample images...\n`);
    
    const results: Array<{
      url: string;
      title: string;
      size: number;
      contentType: string;
      status: number;
    }> = [];
    
    for (const listing of listings) {
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.made-in-china.com/',
          'Cache-Control': 'no-cache',
        };
        
        const response = await fetch(listing.image, { headers });
        const buffer = await response.arrayBuffer();
        
        results.push({
          url: listing.image,
          title: listing.title?.slice(0, 60) || 'N/A',
          size: buffer.byteLength,
          contentType: response.headers.get('content-type') || 'unknown',
          status: response.status
        });
        
        if (results.length % 10 === 0) {
          console.log(`Tested ${results.length}/${listings.length}...`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`Error fetching ${listing.image.slice(0, 80)}: ${error.message}`);
      }
    }
    
    console.log('\n=== Image Size Analysis ===\n');
    
    // Sort by size
    results.sort((a, b) => a.size - b.size);
    
    // Statistics
    const sizes = results.map(r => r.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const median = sizes[Math.floor(sizes.length / 2)];
    
    console.log('Statistics:');
    console.log(`  Smallest: ${min} bytes (${(min / 1024).toFixed(2)} KB)`);
    console.log(`  Largest: ${max} bytes (${(max / 1024).toFixed(2)} KB)`);
    console.log(`  Average: ${avg.toFixed(0)} bytes (${(avg / 1024).toFixed(2)} KB)`);
    console.log(`  Median: ${median} bytes (${(median / 1024).toFixed(2)} KB)`);
    
    // Count by size ranges
    const under1kb = results.filter(r => r.size < 1024).length;
    const under2kb = results.filter(r => r.size < 2048).length;
    const under4kb = results.filter(r => r.size < 4096).length;
    const under10kb = results.filter(r => r.size < 10240).length;
    const over10kb = results.filter(r => r.size >= 10240).length;
    
    console.log('\nSize Distribution:');
    console.log(`  < 1 KB: ${under1kb} (${((under1kb/results.length)*100).toFixed(1)}%)`);
    console.log(`  < 2 KB: ${under2kb} (${((under2kb/results.length)*100).toFixed(1)}%)`);
    console.log(`  < 4 KB (current threshold): ${under4kb} (${((under4kb/results.length)*100).toFixed(1)}%)`);
    console.log(`  < 10 KB: ${under10kb} (${((under10kb/results.length)*100).toFixed(1)}%)`);
    console.log(`  >= 10 KB: ${over10kb} (${((over10kb/results.length)*100).toFixed(1)}%)`);
    
    console.log('\n=== Smallest Images (might be legitimate WebP) ===');
    results.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${(r.size / 1024).toFixed(2)} KB - ${r.contentType} - ${r.title}`);
    });
    
    console.log('\n=== Recommendation ===');
    if (under4kb > results.length * 0.8) {
      console.log('⚠️  Most images are < 4KB. This suggests WebP compression is very efficient.');
      console.log('   Consider lowering threshold to 500 bytes to only block true placeholders.');
    } else if (under4kb > results.length * 0.5) {
      console.log('⚠️  Many images are < 4KB but this might be normal for WebP.');
      console.log('   Consider lowering threshold to 1-2KB.');
    } else {
      console.log('✓  Current 4KB threshold seems appropriate.');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
