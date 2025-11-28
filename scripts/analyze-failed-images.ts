import { prisma } from '../src/lib/prisma';

/**
 * Analyze failed image caching to understand the issues
 * 
 * Usage:
 *   pnpm tsx scripts/analyze-failed-images.ts
 */

(async () => {
  if (!prisma) {
    console.error('ERROR: Prisma client not available. Check DATABASE_URL.');
    process.exit(1);
  }
  
  try {
    console.log('Analyzing Made-in-China listings with external images...\n');
    
    // Get all listings that still have external images (not cached)
    const failedListings = await prisma.savedListing.findMany({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: 'http' }
      },
      select: { id: true, image: true, title: true }
    });
    
    console.log(`Found ${failedListings.length} listings with uncached external images\n`);
    
    // Analyze the image URLs
    const hostStats: Record<string, number> = {};
    const protocolStats: Record<string, number> = {};
    const extensionStats: Record<string, number> = {};
    const pathPatterns: Record<string, number> = {};
    
    const sampleUrls: string[] = [];
    
    for (const listing of failedListings.slice(0, 1000)) {
      if (!listing.image) continue;
      
      try {
        const url = new URL(listing.image);
        
        // Host stats
        hostStats[url.hostname] = (hostStats[url.hostname] || 0) + 1;
        
        // Protocol stats
        protocolStats[url.protocol] = (protocolStats[url.protocol] || 0) + 1;
        
        // Extension from URL
        const pathLower = url.pathname.toLowerCase();
        const ext = pathLower.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)?.[1] || 'none';
        extensionStats[ext] = (extensionStats[ext] || 0) + 1;
        
        // Common path patterns
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const pattern = pathParts[0];
          pathPatterns[pattern] = (pathPatterns[pattern] || 0) + 1;
        }
        
        // Collect samples
        if (sampleUrls.length < 20) {
          sampleUrls.push(listing.image);
        }
      } catch (e) {
        console.log(`Invalid URL: ${listing.image.slice(0, 100)}`);
      }
    }
    
    console.log('=== HOST DISTRIBUTION ===');
    Object.entries(hostStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([host, count]) => {
        console.log(`  ${host}: ${count}`);
      });
    
    console.log('\n=== PROTOCOL DISTRIBUTION ===');
    Object.entries(protocolStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([protocol, count]) => {
        console.log(`  ${protocol}: ${count}`);
      });
    
    console.log('\n=== FILE EXTENSION DISTRIBUTION ===');
    Object.entries(extensionStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`  .${ext}: ${count}`);
      });
    
    console.log('\n=== PATH PATTERNS (first segment) ===');
    Object.entries(pathPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pattern, count]) => {
        console.log(`  /${pattern}/...: ${count}`);
      });
    
    console.log('\n=== SAMPLE FAILED URLs ===');
    sampleUrls.forEach((url, i) => {
      console.log(`${i + 1}. ${url.slice(0, 120)}`);
    });
    
    // Get successfully cached stats
    const cachedListings = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA',
        image: { startsWith: '/cache/' }
      }
    });
    
    const totalListings = await prisma.savedListing.count({
      where: {
        platform: 'MADE_IN_CHINA'
      }
    });
    
    console.log('\n=== OVERALL STATISTICS ===');
    console.log(`Total MIC listings: ${totalListings}`);
    console.log(`Successfully cached: ${cachedListings} (${((cachedListings/totalListings)*100).toFixed(1)}%)`);
    console.log(`Still external: ${failedListings.length} (${((failedListings.length/totalListings)*100).toFixed(1)}%)`);
    console.log(`Missing/null images: ${totalListings - cachedListings - failedListings.length}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
