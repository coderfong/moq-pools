const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Set a placeholder image for all listings that failed to fetch images
 * This ensures the UI doesn't break with missing images
 */
async function setPlaceholderImages() {
  console.log('=== SETTING PLACEHOLDER IMAGES FOR FAILED LISTINGS ===\n');
  
  // Use a placeholder image URL or path
  const placeholderImage = 'https://placehold.co/400x400/e5e7eb/6b7280?text=No+Image';
  // Alternative: '/images/placeholder-product.png' (if you have a local placeholder)
  
  const result = await prisma.$executeRaw`
    UPDATE "SavedListing"
    SET image = ${placeholderImage}
    WHERE platform = 'MADE_IN_CHINA'
      AND url IS NOT NULL
      AND (image IS NULL OR image LIKE '/cache/%')
  `;
  
  console.log(`✅ Updated ${result} listings with placeholder image`);
  console.log(`   Placeholder: ${placeholderImage}`);
  
  // Verify the update
  const remaining = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (image IS NULL OR image LIKE '/cache/%')
  `;
  
  console.log(`\n📊 Remaining listings without valid images: ${remaining[0].count}`);
  
  await prisma.$disconnect();
}

setPlaceholderImages().catch(console.error);
