const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function checkDetailJson() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📊 Checking Alibaba detailJson status...\n');
    
    // Total Alibaba listings
    const total = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    // Without images AND has detailJson
    const withoutImagesHasJson = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { not: null }
      }
    });
    
    // Without images AND no detailJson
    const withoutImagesNoJson = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { equals: null }
      }
    });
    
    console.log(`Total Alibaba listings: ${total}`);
    console.log(`\nListings WITHOUT images:`);
    console.log(`  - WITH detailJson: ${withoutImagesHasJson}`);
    console.log(`  - WITHOUT detailJson: ${withoutImagesNoJson}`);
    console.log(`  - Total missing images: ${withoutImagesHasJson + withoutImagesNoJson}`);
    
    // Sample some to see what detailJson contains
    console.log('\n📋 Sample listings WITHOUT images that HAVE detailJson:\n');
    const samplesWithJson = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { not: null }
      },
      select: { id: true, title: true, url: true, detailJson: true },
      take: 3
    });
    
    samplesWithJson.forEach((s, i) => {
      console.log(`${i+1}. ${s.title.substring(0, 60)}...`);
      console.log(`   URL: ${s.url}`);
      const detail = s.detailJson;
      const imageFields = {
        imageList: detail?.imageList ? `${detail.imageList.length} images` : 'none',
        images: detail?.images ? (Array.isArray(detail.images) ? `${detail.images.length} images` : 'not array') : 'none',
        gallery: detail?.gallery ? `${detail.gallery.length} images` : 'none',
        heroImage: detail?.heroImage ? 'yes' : 'none',
        image: detail?.image ? 'yes' : 'none',
      };
      console.log(`   detailJson image fields:`, imageFields);
      console.log('');
    });
    
    // Sample some without detailJson
    console.log('📋 Sample listings WITHOUT images and WITHOUT detailJson:\n');
    const samplesNoJson = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { equals: null }
      },
      select: { id: true, title: true, url: true },
      take: 3
    });
    
    samplesNoJson.forEach((s, i) => {
      console.log(`${i+1}. ${s.title.substring(0, 60)}...`);
      console.log(`   URL: ${s.url}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDetailJson();
