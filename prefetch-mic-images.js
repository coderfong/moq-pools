const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');
const http = require('http');

async function fetchImageUrl(url, redirectCount = 0) {
  // Prevent infinite redirects
  if (redirectCount > 5) {
    return null;
  }

  // Fetch the page HTML to extract the image URL
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      timeout: 15000
    }, async (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          // Follow the redirect
          const result = await fetchImageUrl(redirectUrl, redirectCount + 1);
          resolve(result);
          return;
        }
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract image URL from HTML
        // Look for patterns like: image.made-in-china.com/.../*.webp or *.jpg
        const imagePatterns = [
          /https?:\/\/image\.made-in-china\.com\/[^"'\s]+\.(webp|jpg|jpeg|png)/i,
          /https?:\/\/[^"'\s]*\.made-in-china\.com\/[^"'\s]+\.(webp|jpg|jpeg|png)/i,
          /"(https:\/\/image[^"]+\.(?:webp|jpg|jpeg|png))"/i
        ];

        for (const pattern of imagePatterns) {
          const imageMatch = data.match(pattern);
          if (imageMatch) {
            let imgUrl = imageMatch[1] || imageMatch[0];
            // Clean up the URL
            imgUrl = imgUrl.replace(/['"]/g, '');
            // Convert to high-quality JPG
            imgUrl = imgUrl.replace(/\.webp$/i, '.jpg');
            imgUrl = imgUrl.replace(/_\d+x\d+/g, '');
            imgUrl = imgUrl.replace(/(\.[^.]+)$/, '_640x640$1');
            resolve(imgUrl);
            return;
          }
        }
        
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function prefetchAllMicImages() {
  console.log('=== PRE-FETCHING ALL MADE-IN-CHINA IMAGES ===\n');
  
  const listings = await prisma.$queryRaw`
    SELECT id, title, url
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND url IS NOT NULL
      AND (image IS NULL OR image LIKE '/cache/%')
    ORDER BY "createdAt" DESC
  `;
  
  console.log(`Found ${listings.length} listings to fetch images for\n`);
  
  let success = 0;
  let failed = 0;
  const BATCH_SIZE = 10;
  const DELAY = 1000; // 1 second between batches
  
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(listings.length / BATCH_SIZE);
    
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, listings.length)} of ${listings.length}) ---`);
    
    await Promise.all(batch.map(async (listing) => {
      try {
        const imageUrl = await fetchImageUrl(listing.url);
        
        if (imageUrl) {
          await prisma.$executeRaw`
            UPDATE "SavedListing"
            SET image = ${imageUrl}
            WHERE id = ${listing.id}
          `;
          console.log(`✅ ${listing.title.substring(0, 50)}...`);
          console.log(`   ${imageUrl}`);
          success++;
        } else {
          console.log(`❌ No image found: ${listing.title.substring(0, 50)}...`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ Error: ${listing.title.substring(0, 50)}...`);
        failed++;
      }
    }));
    
    // Progress
    console.log(`\n📊 Progress: ${success} success, ${failed} failed, ${i + batch.length}/${listings.length} processed`);
    
    // Delay between batches
    if (i + BATCH_SIZE < listings.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }
  
  console.log('\n\n================================================================================');
  console.log('FINAL RESULTS');
  console.log('================================================================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${listings.length}`);
  
  await prisma.$disconnect();
}

prefetchAllMicImages().catch(console.error);
