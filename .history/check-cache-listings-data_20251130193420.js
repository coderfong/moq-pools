#!/usr/bin/env node
/**
 * Check what data is available for listings with /cache/ images
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkCacheListings() {
  try {
    // Sample 20 listings with /cache/ images
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: '/cache/' }
      },
      select: {
        id: true,
        url: true,
        title: true,
        image: true,
        detailJson: true
      },
      take: 20
    });
    
    console.log(`Checking ${listings.length} sample listings...\n`);
    
    let withDetailJson = 0;
    let withGallery = 0;
    let withHeroImage = 0;
    let withNothing = 0;
    
    listings.forEach((listing, i) => {
      console.log(`[${i + 1}] ${listing.title.substring(0, 50)}...`);
      console.log(`  Image: ${listing.image}`);
      console.log(`  URL: ${listing.url}`);
      
      if (listing.detailJson) {
        withDetailJson++;
        const detail = listing.detailJson;
        
        if (detail.gallery && detail.gallery.length > 0) {
          withGallery++;
          console.log(`  ✅ Has gallery: ${detail.gallery.length} images`);
          console.log(`     First: ${detail.gallery[0]}`);
        } else if (detail.heroImage) {
          withHeroImage++;
          console.log(`  ⚠️  Has heroImage: ${detail.heroImage}`);
        } else {
          console.log(`  ❌ Has detailJson but no images`);
        }
      } else {
        withNothing++;
        console.log(`  ❌ No detailJson`);
      }
      console.log('');
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Listings with detailJson: ${withDetailJson}/${listings.length}`);
    console.log(`  - With gallery: ${withGallery}`);
    console.log(`  - With heroImage only: ${withHeroImage}`);
    console.log(`Listings with NO detailJson: ${withNothing}/${listings.length}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCacheListings();
