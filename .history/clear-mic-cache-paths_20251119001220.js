const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearMicImagePaths() {
  console.log('=== CLEARING MADE-IN-CHINA CACHED IMAGE PATHS ===\n');
  console.log('This will force images to be re-fetched at high quality on next page load.\n');
  
  const result = await prisma.$executeRaw`
    UPDATE "SavedListing"
    SET image = NULL
    WHERE platform = 'MADE_IN_CHINA'
      AND image LIKE '/cache/%'
  `;
  
  console.log(`✅ Cleared ${result} cached image paths`);
  console.log('\nNext time these listings load:');
  console.log('  1. The scraper will fetch fresh image URLs from Made-in-China');
  console.log('  2. normalizeImage() will convert .webp → .jpg_640x640');
  console.log('  3. imageCache will download and cache the high-quality JPG');
  console.log('\nNo page load slowdown - images will be fetched in the background!');
  
  await prisma.$disconnect();
}

clearMicImagePaths().catch(console.error);
