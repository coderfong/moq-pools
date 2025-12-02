const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function countR2Alibaba() {
  const count = await prisma.savedListing.count({
    where: {
      platform: 'ALIBABA',
      image: {
        startsWith: process.env.R2_PUBLIC_URL
      }
    }
  });
  
  console.log('Total Alibaba listings with R2 images:', count);
  await prisma.$disconnect();
}

countR2Alibaba();
