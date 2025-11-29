#!/usr/bin/env node
/**
 * Fix Alibaba listings that have /cache/ image paths
 * Replace with original Alibaba CDN URLs from detailJson
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixAlibabaImageUrls(dryRun = false) {
  try {
    console.log('='.repeat(80));
    console.log(dryRun ? 'DRY RUN: PREVIEWING ALIBABA IMAGE URL FIXES' : 'FIXING ALIBABA IMAGE URLS');
    console.log('='.repeat(80));
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE: No database changes will be made\n');
    }
    
    // Find all Alibaba listings with /cache/ images
    const cacheListings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: {
          startsWith: '/cache/'
        }
      },
      select: {
        id: true,
        url: true,
        title: true,
        image: true,
        detailJson: true
      }
    });
    
    console.log(`\nFound ${cacheListings.length} Alibaba listings with /cache/ images\n`);
    
    if (cacheListings.length === 0) {
      console.log('No listings to fix!');
      return;
    }
    
    let fixed = 0;
    let noImages = 0;
    let errors = 0;
    
    for (let i = 0; i < cacheListings.length; i++) {
      const listing = cacheListings[i];
      const progress = `[${i + 1}/${cacheListings.length}]`;
      
      console.log(`${progress} ${listing.title.substring(0, 60)}...`);
      console.log(`  Current: ${listing.image}`);
      
      try {
        // Extract original image URL from detailJson
        let originalUrl = null;
        
        if (listing.detailJson) {
          const detail = listing.detailJson;
          
          // Priority: Get single best quality image from gallery
          if (detail.gallery && detail.gallery.length > 0) {
            // Priority 1: Find existing 960x960 quality images (best quality from carousel)
            originalUrl = detail.gallery.find(url => 
              url.includes('alicdn.com') && 
              url.includes('_960x960') &&
              !url.includes('tps-960-102') // Skip badges/watermarks
            );
            
            // Priority 2: Find original full-size images (keep as-is, don't modify)
            if (!originalUrl) {
              originalUrl = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                url.match(/\.jpg$/i) && // Ends with .jpg
                !url.match(/_\d+x\d+/) && // No size suffix
                !url.includes('tps-960-102')
              );
            }
            
            // Priority 3: Find large resolution images (600x600, 350x350)
            if (!originalUrl) {
              originalUrl = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                (url.includes('_600x600') || url.includes('_350x350')) &&
                !url.includes('tps-960-102')
              );
            }
            
            // Priority 4: Get any non-thumbnail image
            if (!originalUrl) {
              originalUrl = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                !url.includes('_80x80') &&
                !url.includes('_50x50') &&
                !url.includes('_120x120') &&
                !url.includes('tps-960-102')
              );
            }
            
            // Fallback to first gallery image
            if (!originalUrl) {
              originalUrl = detail.gallery[0];
            }
          } else if (detail.heroImage) {
            originalUrl = detail.heroImage;
          }
          
          // Only upgrade small thumbnails to larger sizes (these variants should exist)
          if (originalUrl) {
            if (originalUrl.includes('_80x80')) {
              // Upgrade to 350x350 (more reliable than 960x960)
              originalUrl = originalUrl.replace('_80x80', '_350x350');
            } else if (originalUrl.includes('_50x50')) {
              originalUrl = originalUrl.replace('_50x50', '_350x350');
            } else if (originalUrl.includes('_120x120')) {
              originalUrl = originalUrl.replace('_120x120', '_350x350');
            }
            
            // Ensure https protocol
            if (originalUrl.startsWith('//')) {
              originalUrl = 'https:' + originalUrl;
            }
          }
        }
        
        if (!originalUrl) {
          // If no image in detailJson, try to scrape from URL
          console.log(`  ⚠️  No image in detailJson, skipping...`);
          noImages++;
          continue;
        }
        
        // Update database with original URL
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: { image: originalUrl }
        });
        
        console.log(`  ✅ Fixed: ${originalUrl.substring(0, 80)}`);
        fixed++;
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`⚠️  No images found: ${noImages}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixAlibabaImageUrls();
