const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const prisma = new PrismaClient();

/**
 * Advanced image fetching using Puppeteer
 * This can handle JavaScript-rendered images that basic HTTP requests miss
 */
async function refetchFailedImagesWithPuppeteer() {
  console.log('=== RE-FETCHING FAILED IMAGES WITH PUPPETEER ===\n');
  
  // Get failed listings
  const failed = await prisma.$queryRaw`
    SELECT id, title, url
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND url IS NOT NULL
      AND (image IS NULL OR image LIKE '/cache/%')
    ORDER BY "createdAt" DESC
    LIMIT 100
  `;
  
  console.log(`Found ${failed.length} failed listings to retry\n`);
  
  if (failed.length === 0) {
    console.log('No failed listings found!');
    await prisma.$disconnect();
    return;
  }
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let success = 0;
  let stillFailed = 0;
  
  for (let i = 0; i < failed.length; i++) {
    const listing = failed[i];
    console.log(`\n[${i + 1}/${failed.length}] ${listing.title.substring(0, 50)}...`);
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the page
      await page.goto(listing.url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Try multiple selectors for images
      const imageUrl = await page.evaluate(() => {
        // Common image selectors for Made-in-China
        const selectors = [
          'img[class*="product"]',
          'img[class*="main"]',
          'img[class*="detail"]',
          '.product-image img',
          '.main-image img',
          'meta[property="og:image"]',
          'img[itemprop="image"]'
        ];
        
        for (const selector of selectors) {
          const elem = document.querySelector(selector);
          if (elem) {
            const src = elem.tagName === 'META' ? elem.content : elem.src;
            if (src && src.includes('image.made-in-china.com')) {
              // Convert to high quality version
              let imgUrl = src.replace(/\.webp$/i, '.jpg');
              imgUrl = imgUrl.replace(/_\d+x\d+/g, '');
              imgUrl = imgUrl.replace(/(\.[^.]+)$/, '_640x640$1');
              return imgUrl;
            }
          }
        }
        return null;
      });
      
      await page.close();
      
      if (imageUrl) {
        await prisma.$executeRaw`
          UPDATE "SavedListing"
          SET image = ${imageUrl}
          WHERE id = ${listing.id}
        `;
        console.log(`✅ Found: ${imageUrl}`);
        success++;
      } else {
        console.log(`❌ Still no image found`);
        stillFailed++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      stillFailed++;
    }
  }
  
  await browser.close();
  
  console.log('\n\n================================================================================');
  console.log('PUPPETEER RE-FETCH RESULTS');
  console.log('================================================================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Still Failed: ${stillFailed}`);
  console.log(`📊 Total Attempted: ${failed.length}`);
  
  await prisma.$disconnect();
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  refetchFailedImagesWithPuppeteer().catch(console.error);
} catch (e) {
  console.log('❌ Puppeteer not installed!');
  console.log('Install with: pnpm add -D puppeteer');
  console.log('\nAlternatively, run set-placeholder-images.js to set placeholders for failed listings.');
}
