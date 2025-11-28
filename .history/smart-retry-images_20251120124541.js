const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

/**
 * Smart retry with multiple strategies:
 * 1. Try direct image URL patterns
 * 2. Use product ID from URL to construct image URL
 * 3. Set placeholder if all else fails
 */
async function smartRetryImages() {
  console.log('=== SMART RETRY FOR FAILED IMAGES ===\n');
  
  const failed = await prisma.$queryRaw`
    SELECT id, title, url
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND url IS NOT NULL
      AND (image IS NULL OR image LIKE '/cache/%')
    ORDER BY "createdAt" DESC
  `;
  
  console.log(`Found ${failed.length} listings to process\n`);
  
  let success = 0;
  let usedPlaceholder = 0;
  let stillFailed = 0;
  
  const placeholder = 'https://placehold.co/400x400/f3f4f6/6b7280?text=Product+Image';
  
  for (let i = 0; i < failed.length; i++) {
    const listing = failed[i];
    
    if ((i + 1) % 50 === 0) {
      console.log(`\nProgress: ${i + 1}/${failed.length}...`);
    }
    
    try {
      // Extract product ID from URL
      // Example: https://company.made-in-china.com/product/abc123.html
      const urlMatch = listing.url.match(/product\/([^\/\.]+)/i);
      
      if (urlMatch) {
        const productId = urlMatch[1];
        
        // Try common Made-in-China image URL patterns
        const imagePatterns = [
          `https://image.made-in-china.com/${productId}_640x640.jpg`,
          `https://image.made-in-china.com/${productId}.jpg`,
          `https://image.made-in-china.com/prod_${productId}_640x640.jpg`,
        ];
        
        let foundImage = null;
        
        for (const imgUrl of imagePatterns) {
          const exists = await checkImageExists(imgUrl);
          if (exists) {
            foundImage = imgUrl;
            break;
          }
        }
        
        if (foundImage) {
          await prisma.$executeRaw`
            UPDATE "SavedListing"
            SET image = ${foundImage}
            WHERE id = ${listing.id}
          `;
          success++;
          continue;
        }
      }
      
      // If no image found, use placeholder
      await prisma.$executeRaw`
        UPDATE "SavedListing"
        SET image = ${placeholder}
        WHERE id = ${listing.id}
      `;
      usedPlaceholder++;
      
    } catch (error) {
      stillFailed++;
    }
  }
  
  console.log('\n\n================================================================================');
  console.log('SMART RETRY RESULTS');
  console.log('================================================================================');
  console.log(`✅ Found Real Images: ${success}`);
  console.log(`🖼️  Used Placeholder: ${usedPlaceholder}`);
  console.log(`❌ Still Failed: ${stillFailed}`);
  console.log(`📊 Total: ${failed.length}`);
  
  await prisma.$disconnect();
}

function checkImageExists(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type']?.startsWith('image/'));
    }).on('error', () => resolve(false));
  });
}

smartRetryImages().catch(console.error);
