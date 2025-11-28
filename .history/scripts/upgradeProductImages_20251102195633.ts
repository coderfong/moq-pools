import { prisma } from '../src/lib/prisma';

/**
 * Upgrade Product.imagesJson to use cached images from SavedListings
 * instead of /seed/ placeholders.
 * 
 * For each Product with sourceUrl:
 *  1. Check if imagesJson contains /seed/ placeholder
 *  2. Look up the corresponding SavedListing by sourceUrl
 *  3. If SavedListing has a /cache/ image, update Product.imagesJson
 * 
 * Usage:
 *   pnpm tsx scripts/upgradeProductImages.ts
 *   pnpm tsx scripts/upgradeProductImages.ts --dry  (preview only)
 */

const dry = process.argv.includes('--dry');

(async () => {
  if (!prisma) {
    console.error('[ERROR] Prisma not available');
    process.exit(1);
  }

  console.log(`[upgradeProductImages] Starting (dry=${dry})`);

  // Find all products with sourceUrl
  const products = await prisma.product.findMany({
    where: {
      sourceUrl: { not: null },
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      imagesJson: true,
    },
  });

  console.log(`Found ${products.length} products with sourceUrl`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Parse current images
      let images: string[] = [];
      try {
        const parsed = JSON.parse(product.imagesJson);
        images = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.log(`[SKIP] ${product.id}: Failed to parse imagesJson`);
        skipped++;
        continue;
      }

      // Check if first image is a /seed/ placeholder
      const currentImage = images[0] || '';
      if (!currentImage.startsWith('/seed/')) {
        // Already has a good image
        skipped++;
        continue;
      }

      // Look up SavedListing by sourceUrl
      const listing = await prisma.savedListing.findUnique({
        where: { url: product.sourceUrl! },
        select: { image: true },
      });

      if (!listing || !listing.image) {
        console.log(`[SKIP] ${product.id}: No SavedListing found for ${product.sourceUrl}`);
        skipped++;
        continue;
      }

      // Check if SavedListing has a /cache/ image
      if (!listing.image.startsWith('/cache/')) {
        console.log(`[SKIP] ${product.id}: SavedListing image is not cached (${listing.image})`);
        skipped++;
        continue;
      }

      // Update Product.imagesJson
      const newImages = [listing.image, ...images.slice(1)];
      const newImagesJson = JSON.stringify(newImages);

      if (dry) {
        console.log(`[DRY] ${product.id}: Would update ${currentImage} -> ${listing.image}`);
        updated++;
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: { imagesJson: newImagesJson },
        });
        console.log(`[UPDATED] ${product.id}: ${currentImage} -> ${listing.image}`);
        updated++;
      }
    } catch (error: any) {
      console.error(`[ERROR] ${product.id}: ${error.message}`);
      errors++;
    }
  }

  console.log(`\nDone${dry ? ' (dry run)' : ''}:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
})();
