#!/usr/bin/env node
/**
 * Fix Alibaba listings that have /cache/ image paths
 * Replace with original Alibaba CDN URLs from detailJson
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixAlibabaImageUrls() {
  try {
    console.log('='.repeat(80));
    console.log('FIXING ALIBABA IMAGE URLS');
    console.log('='.repeat(80));
    
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
            // Priority 1: Find 960x960 quality images (best quality from Alibaba carousel)
            originalUrl = detail.gallery.find(url => 
              url.includes('alicdn.com') && 
              url.includes('_960x960') &&
              !url.includes('tps-960-102') // Skip badges/watermarks
            );
            
            // Priority 2: Find original full-size images and upgrade to 960x960
            if (!originalUrl) {
              const originalImage = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                url.match(/\.jpg$/i) && // Ends with .jpg
                !url.match(/_\d+x\d+/) && // No size suffix
                !url.includes('tps-960-102')
              );
              
              if (originalImage) {
                // Upgrade to 960x960 quality for better CDN optimization
                originalUrl = originalImage.replace(/\.jpg$/i, '_960x960q80.jpg');
              }
            }
            
            // Priority 3: Find 350x350 or 600x600 images and upgrade
            if (!originalUrl) {
              const mediumImage = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                (url.includes('_350x350') || url.includes('_600x600')) &&
                !url.includes('tps-960-102')
              );
              
              if (mediumImage) {
                // Upgrade to 960x960
                originalUrl = mediumImage
                  .replace('_350x350', '_960x960q80')
                  .replace('_600x600', '_960x960q80');
              }
            }
            
            // Priority 4: Get any non-thumbnail image and upgrade
            if (!originalUrl) {
              const anyImage = detail.gallery.find(url => 
                url.includes('alicdn.com') && 
                !url.includes('_80x80') &&
                !url.includes('_50x50') &&
                !url.includes('_120x120') &&
                !url.includes('tps-960-102')
              );
              
              if (anyImage && anyImage.match(/\.jpg$/i) && !anyImage.match(/_\d+x\d+/)) {
                originalUrl = anyImage.replace(/\.jpg$/i, '_960x960q80.jpg');
              } else if (anyImage) {
                originalUrl = anyImage;
              }
            }
            
            // Fallback to first gallery image and upgrade if possible
            if (!originalUrl) {
              originalUrl = detail.gallery[0];
              if (originalUrl && !originalUrl.includes('_960x960') && originalUrl.match(/\.jpg$/i)) {
                originalUrl = originalUrl.replace(/\.jpg$/i, '_960x960q80.jpg');
              }
            }
          } else if (detail.heroImage) {
            originalUrl = detail.heroImage;
            // Upgrade heroImage to 960x960 if it's not already
            if (originalUrl && !originalUrl.includes('_960x960') && originalUrl.match(/\.jpg$/i) && !originalUrl.match(/_\d+x\d+/)) {
              originalUrl = originalUrl.replace(/\.jpg$/i, '_960x960q80.jpg');
            }
          }
          
          // Upgrade remaining thumbnail URLs to 960x960 quality
          if (originalUrl) {
            if (originalUrl.includes('_80x80')) {
              originalUrl = originalUrl.replace('_80x80', '_960x960q80');
            } else if (originalUrl.includes('_50x50')) {
              originalUrl = originalUrl.replace('_50x50', '_960x960q80');
            } else if (originalUrl.includes('_120x120')) {
              originalUrl = originalUrl.replace('_120x120', '_960x960q80');
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
