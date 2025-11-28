const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSample() {
  const listing = await prisma.savedListing.findFirst({
    where: {
      platform: 'MADE_IN_CHINA',
      url: { not: null },
      image: null
    }
  });
  
  if (!listing) {
    console.log('No Made-in-China listings found without images');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Sample listing:');
  console.log('Title:', listing.title);
  console.log('URL:', listing.url);
  console.log('Current image:', listing.image);
  
  // Test fetching the image URL
  console.log('\nTesting image fetch from URL...');
  const https = require('https');
  const http = require('http');
  
  const protocol = listing.url.startsWith('https') ? https : http;
  protocol.get(listing.url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
    },
    timeout: 10000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('\nSearching for image URLs in HTML...');
      
      // Look for different patterns
      const patterns = [
        /https?:\/\/image\.made-in-china\.com\/[^"'\s]+\.(webp|jpg|jpeg|png)/gi,
        /https?:\/\/[^"'\s]+\.made-in-china\.com\/[^"'\s]+\.(webp|jpg|jpeg|png)/gi,
        /src="([^"]+\.(webp|jpg|jpeg|png))"/gi
      ];
      
      let found = false;
      for (let pattern of patterns) {
        const matches = data.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`\nFound ${matches.length} images with pattern:`, pattern.toString());
          console.log('First few matches:');
          matches.slice(0, 5).forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
          found = true;
        }
      }
      
      if (!found) {
        console.log('\nNo image URLs found. Checking HTML length:', data.length);
        console.log('First 500 chars:', data.substring(0, 500));
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching URL:', err.message);
  });
  
  await prisma.$disconnect();
}

checkSample();
