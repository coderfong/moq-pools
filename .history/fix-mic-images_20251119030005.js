const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs').promises;
const path = require('path');

async function fixMadeInChinaImages() {
  console.log('=== FIXING MADE-IN-CHINA IMAGES ===\n');
  
  // Get all Made-in-China listings with WebP images
  const listings = await prisma.$queryRaw`
    SELECT id, title, url, image
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND image IS NOT NULL
      AND image LIKE '%.webp%'
  `;
  
  console.log(`Found ${listings.length} Made-in-China listings with WebP images\n`);
  
  if (listings.length === 0) {
    console.log('No WebP images to fix!');
    await prisma.$disconnect();
    return;
  }
  
  // Delete cached WebP files
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  let deletedCount = 0;
  let notFoundCount = 0;
  
  console.log('Deleting cached WebP images...\n');
  
  for (const listing of listings) {
    if (!listing.image.startsWith('/cache/')) continue;
    
    const filename = listing.image.replace('/cache/', '');
    const filepath = path.join(cacheDir, filename);
    
    try {
      await fs.unlink(filepath);
      console.log(`✅ Deleted: ${filename}`);
      deletedCount++;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  Not found: ${filename}`);
        notFoundCount++;
      } else {
        console.log(`❌ Error deleting ${filename}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Deleted: ${deletedCount}`);
  console.log(`  Not found: ${notFoundCount}`);
  console.log(`  Total processed: ${listings.length}`);
  
  console.log('\n✅ Cached WebP images deleted!');
  console.log('Next time these listings load, they will fetch high-quality JPG images instead.\n');
  
  // Update the image URLs in the database to use JPG
  console.log('Updating image URLs in database...\n');
  
  for (const listing of listings) {
    try {
      // The normalizeImage function will now convert .webp to .jpg_640x640
      // We need to fetch the listing page again to get the updated image
      // For now, just mark them for re-fetch by clearing the image
      // Or we can update the URL pattern directly
      
      const newUrl = listing.url
        .replace(/\.webp/gi, '.jpg')
        .replace(/(\.[^.]+)$/, '_640x640$1');
      
      console.log(`Updating ${listing.id}: ${listing.url} -> ${newUrl}`);
      
      // We'll clear the image cache path so it gets re-fetched
      await prisma.$executeRaw`
        UPDATE "SavedListing"
        SET image = NULL
        WHERE id = ${listing.id}
      `;
      
    } catch (error) {
      console.log(`❌ Error updating ${listing.id}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Database updated! Images will be re-fetched at high quality on next load.');
  
  await prisma.$disconnect();
}

fixMadeInChinaImages().catch(console.error);
