const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function checkStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📊 Checking Alibaba image status...\n');
    
    // Total Alibaba listings
    const total = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    // With images
    const withImages = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { not: null },
        image: { not: '' }
      }
    });
    
    // Without images
    const withoutImages = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    // Using R2
    const usingR2 = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL }
      }
    });
    
    // Using direct Alibaba URLs
    const directUrls = await prisma.savedListing.count({
      where: {
        platform: 'ALIBABA',
        image: { not: null },
        NOT: { image: { startsWith: R2_PUBLIC_URL } },
        image: { not: '' }
      }
    });
    
    console.log(`Total Alibaba listings: ${total}`);
    console.log(`With images: ${withImages} (${(withImages/total*100).toFixed(1)}%)`);
    console.log(`Without images: ${withoutImages} (${(withoutImages/total*100).toFixed(1)}%)`);
    console.log(`Using R2: ${usingR2} (${(usingR2/total*100).toFixed(1)}%)`);
    console.log(`Direct Alibaba URLs: ${directUrls} (${(directUrls/total*100).toFixed(1)}%)`);
    
    // Sample some listings to see what's happening
    console.log('\n📋 Sample listings without images:\n');
    const samples = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ]
      },
      select: { id: true, title: true, url: true, image: true },
      take: 5
    });
    
    samples.forEach((s, i) => {
      console.log(`${i+1}. ${s.title.substring(0, 60)}...`);
      console.log(`   URL: ${s.url}`);
      console.log(`   Image: ${s.image || 'NULL'}\n`);
    });
    
    // Sample some with R2 images
    console.log('📋 Sample listings with R2 images:\n');
    const r2Samples = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL }
      },
      select: { id: true, title: true, image: true },
      take: 5
    });
    
    r2Samples.forEach((s, i) => {
      console.log(`${i+1}. ${s.title.substring(0, 60)}...`);
      console.log(`   Image: ${s.image}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
