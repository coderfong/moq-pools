#!/usr/bin/env node
/**
 * Test single image selection logic from detailJson.gallery
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function testImageSelection() {
  try {
    // Find a listing with detailJson.gallery
    const listing = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        detailJson: {
          path: ['gallery'],
          not: null
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
    
    if (!listing) {
      console.log('No listing found with gallery data');
      return;
    }
    
    console.log('Testing with:', listing.title);
    console.log('URL:', listing.url);
    console.log('Current image:', listing.image);
    console.log('\n' + '='.repeat(80));
    
    const detail = listing.detailJson;
    
    if (detail.gallery && detail.gallery.length > 0) {
      console.log(`\nFound ${detail.gallery.length} images in gallery:\n`);
      detail.gallery.forEach((url, i) => {
        const size = url.match(/_(\d+x\d+)/)?.[1] || 'original';
        const quality = url.match(/q(\d+)/)?.[1] || '';
        console.log(`  [${i}] ${size}${quality ? ' q' + quality : ''}: ${url}`);
      });
      
      // Apply selection logic
      let selectedUrl = null;
      
      // Priority 1: Find 960x960 quality images
      selectedUrl = detail.gallery.find(url => 
        url.includes('alicdn.com') && 
        url.includes('_960x960') &&
        !url.includes('tps-960-102')
      );
      
      if (selectedUrl) {
        console.log('\n✅ Selected 960x960 image (Priority 1):', selectedUrl);
      } else {
        // Priority 2: Original full-size
        selectedUrl = detail.gallery.find(url => 
          url.includes('alicdn.com') && 
          url.match(/\.jpg$/i) &&
          !url.match(/_\d+x\d+/) &&
          !url.includes('tps-960-102')
        );
        
        if (selectedUrl) {
          console.log('\n✅ Selected original image (Priority 2):', selectedUrl);
        } else {
          // Priority 3: 350x350 or 600x600
          selectedUrl = detail.gallery.find(url => 
            url.includes('alicdn.com') && 
            (url.includes('_350x350') || url.includes('_600x600')) &&
            !url.includes('tps-960-102')
          );
          
          if (selectedUrl) {
            console.log('\n✅ Selected 350x350/600x600 image (Priority 3):', selectedUrl);
          } else {
            // Priority 4: Any non-thumbnail
            selectedUrl = detail.gallery.find(url => 
              url.includes('alicdn.com') && 
              !url.includes('_80x80') &&
              !url.includes('_50x50') &&
              !url.includes('_120x120') &&
              !url.includes('tps-960-102')
            );
            
            if (selectedUrl) {
              console.log('\n✅ Selected non-thumbnail image (Priority 4):', selectedUrl);
            } else {
              selectedUrl = detail.gallery[0];
              console.log('\n⚠️  Using first gallery image (fallback):', selectedUrl);
            }
          }
        }
      }
      
      // Ensure https protocol
      if (selectedUrl && selectedUrl.startsWith('//')) {
        selectedUrl = 'https:' + selectedUrl;
        console.log('  → With https:', selectedUrl);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImageSelection();
