const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMicImagesInDB() {
  console.log('=== FIXING MADE-IN-CHINA IMAGE URLS IN DATABASE ===\n');
  
  // Get all Made-in-China listings
  const listings = await prisma.$queryRaw`
    SELECT id, title, url, image
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (image IS NOT NULL OR url IS NOT NULL)
  `;
  
  console.log(`Found ${listings.length} Made-in-China listings\n`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const listing of listings) {
    try {
      let newImageUrl = null;
      
      // If there's an existing image URL, upgrade it
      if (listing.image) {
        // If it's a cached image path, we'll fetch the original URL from the page
        if (listing.image.startsWith('/cache/')) {
          // Extract from URL instead
          if (listing.url) {
            // Try to construct the image URL from the product URL
            // Made-in-China pattern: /product/Product-Name_xxxxx.html
            const match = listing.url.match(/\/product\/([^_]+)_(\d+)\.html/);
            if (match) {
              const productSlug = match[1];
              const productId = match[2];
              // Construct high-quality JPG URL
              newImageUrl = `https://image.made-in-china.com/2f0j00${productId.substring(0, 6)}/${productSlug}_640x640.jpg`;
            }
          }
        } else {
          // It's an external URL, upgrade it
          newImageUrl = listing.image;
          
          // Convert WebP to JPG
          if (newImageUrl.includes('.webp')) {
            newImageUrl = newImageUrl.replace(/\.webp/gi, '.jpg');
          }
          
          // Add or update size suffix
          if (newImageUrl.includes('image.made-in-china.com') || newImageUrl.includes('micstatic.com')) {
            // Remove existing size suffixes
            newImageUrl = newImageUrl.replace(/_\d+x\d+/g, '');
            // Add high-quality size
            newImageUrl = newImageUrl.replace(/(\.[^.]+)$/, '_640x640$1');
          }
        }
      }
      
      if (newImageUrl && newImageUrl !== listing.image) {
        await prisma.$executeRaw`
          UPDATE "SavedListing"
          SET image = ${newImageUrl}
          WHERE id = ${listing.id}
        `;
        console.log(`✅ Updated: ${listing.title.substring(0, 50)}...`);
        console.log(`   Old: ${listing.image}`);
        console.log(`   New: ${newImageUrl}\n`);
        updated++;
      } else {
        skipped++;
      }
      
    } catch (error) {
      console.log(`❌ Error updating ${listing.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${listings.length}`);
  
  await prisma.$disconnect();
}

fixMicImagesInDB().catch(console.error);
