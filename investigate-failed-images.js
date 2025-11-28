const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateFailures() {
  console.log('=== INVESTIGATING FAILED IMAGE FETCHES ===\n');
  
  // Get listings that still have no images or cache paths
  const failed = await prisma.$queryRaw`
    SELECT id, title, url, image, "createdAt"
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND url IS NOT NULL
      AND (image IS NULL OR image LIKE '/cache/%')
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;
  
  console.log(`Found ${failed.length} failed listings (showing first 50)`);
  console.log('\nSample URLs to check:');
  
  failed.slice(0, 10).forEach((listing, idx) => {
    console.log(`\n${idx + 1}. ${listing.title.substring(0, 60)}...`);
    console.log(`   URL: ${listing.url}`);
    console.log(`   Current Image: ${listing.image || 'NULL'}`);
  });
  
  // Check if these listings have other data
  console.log('\n\n=== STATISTICS ===');
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN image IS NULL THEN 1 END) as null_images,
      COUNT(CASE WHEN image LIKE '/cache/%' THEN 1 END) as cache_paths,
      COUNT(CASE WHEN image LIKE 'http%' THEN 1 END) as valid_urls
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
  `;
  
  console.log('Made-in-China Listings:');
  console.log(`  Total: ${stats[0].total}`);
  console.log(`  NULL images: ${stats[0].null_images}`);
  console.log(`  Cache paths (need fixing): ${stats[0].cache_paths}`);
  console.log(`  Valid URLs: ${stats[0].valid_urls}`);
  
  // Check if we can use default images or mark them as unavailable
  console.log('\n\n=== RECOMMENDATIONS ===');
  console.log('1. Set a placeholder/default image for listings without images');
  console.log('2. Mark these listings as "image unavailable" in the database');
  console.log('3. Try alternative scraping methods with puppeteer/playwright');
  console.log('4. Contact Made-in-China support for bulk image access');
  
  await prisma.$disconnect();
}

investigateFailures().catch(console.error);
