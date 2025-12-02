const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const KNOWN_BAD_HASHES = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb',
  'e7cc244e1d0f558ae9669f57b973758bc14103ee',
];

async function analyzeBadListings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📊 Analyzing listings with bad images...\n');
    
    const badHashConditions = KNOWN_BAD_HASHES.map(hash => ({
      image: { contains: hash }
    }));
    
    // Get all bad listings
    const allBad = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: badHashConditions
      }
    });
    
    // With detailJson
    const withDetail = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: badHashConditions,
        detailJson: { not: null }
      }
    });
    
    // Without detailJson
    const withoutDetail = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: badHashConditions,
        detailJson: { equals: null }
      }
    });
    
    console.log(`Total bad images: ${allBad}`);
    console.log(`  - With detailJson: ${withDetail}`);
    console.log(`  - Without detailJson: ${withoutDetail}\n`);
    
    // Check one specific bad listing to see the full structure
    console.log('🔍 Sample bad listing detail:\n');
    const sample = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        image: { contains: KNOWN_BAD_HASHES[0] },
        detailJson: { not: null }
      },
      select: {
        id: true,
        title: true,
        url: true,
        image: true,
        detailJson: true
      }
    });
    
    if (sample) {
      console.log(`Title: ${sample.title}`);
      console.log(`URL: ${sample.url}`);
      console.log(`Current image: ${sample.image}\n`);
      console.log(`detailJson structure:`);
      console.log(`  - gallery: ${sample.detailJson?.gallery ? sample.detailJson.gallery.length + ' images' : 'none'}`);
      console.log(`  - imageList: ${sample.detailJson?.imageList ? sample.detailJson.imageList.length + ' images' : 'none'}`);
      console.log(`  - images: ${sample.detailJson?.images ? (Array.isArray(sample.detailJson.images) ? sample.detailJson.images.length + ' images' : 'not array') : 'none'}`);
      console.log(`  - heroImage: ${sample.detailJson?.heroImage ? 'yes' : 'none'}`);
      console.log(`  - image: ${sample.detailJson?.image ? 'yes' : 'none'}`);
      
      if (sample.detailJson?.gallery) {
        console.log(`\n  Gallery URLs:`);
        sample.detailJson.gallery.forEach((url, i) => {
          console.log(`    ${i + 1}. ${url}`);
        });
      }
      
      if (sample.detailJson?.heroImage) {
        console.log(`\n  Hero image: ${sample.detailJson.heroImage}`);
      }
    }
    
    console.log('\n💡 Recommendation:\n');
    console.log('These listings have bad detailJson data (only TPS thumbnails/banners).');
    console.log('Options:');
    console.log('  1. Re-scrape these specific listings to get fresh detailJson');
    console.log('  2. Clear their images and let them be picked up by future scraping');
    console.log('  3. Mark them as problematic for manual review');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeBadListings();
