const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function checkDetailJsonStructure() {
  const prisma = new PrismaClient();
  
  try {
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [{ image: null }, { image: '' }],
        detailJson: { not: null }
      },
      select: { id: true, title: true, detailJson: true },
      take: 50
    });
    
    console.log(`\n📋 Analyzing detailJson structure for ${listings.length} listings:\n`);
    
    const fieldCounts = {
      gallery: 0,
      imageList: 0,
      images: 0,
      heroImage: 0,
      image: 0,
      mainImage: 0,
      productImage: 0,
      thumbnailUrl: 0,
      imgUrl: 0,
      imageUrl: 0,
    };
    
    const sampleFields = {};
    
    listings.forEach(listing => {
      if (!listing.detailJson) return;
      
      // Check all possible image fields
      Object.keys(fieldCounts).forEach(field => {
        if (listing.detailJson[field]) {
          fieldCounts[field]++;
          if (!sampleFields[field]) {
            sampleFields[field] = listing.detailJson[field];
          }
        }
      });
      
      // Also capture any field that contains 'image' or 'img'
      Object.keys(listing.detailJson).forEach(key => {
        if ((key.toLowerCase().includes('image') || key.toLowerCase().includes('img')) && !fieldCounts[key]) {
          fieldCounts[key] = (fieldCounts[key] || 0) + 1;
          if (!sampleFields[key]) {
            sampleFields[key] = listing.detailJson[key];
          }
        }
      });
    });
    
    console.log('Field frequency:');
    Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        if (count > 0) {
          console.log(`  ${field}: ${count}/${listings.length}`);
        }
      });
    
    console.log('\n\nSample values:');
    Object.entries(sampleFields).forEach(([field, value]) => {
      console.log(`\n${field}:`);
      if (Array.isArray(value)) {
        console.log(`  Type: Array[${value.length}]`);
        if (value.length > 0) {
          console.log(`  First item:`, JSON.stringify(value[0]).substring(0, 150));
        }
      } else {
        console.log(`  Type: ${typeof value}`);
        console.log(`  Value:`, JSON.stringify(value).substring(0, 150));
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDetailJsonStructure();
