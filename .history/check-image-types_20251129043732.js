const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImageTypes() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      image: true,
    },
    take: 50,
  });

  const withCache = products.filter(p => p.image?.startsWith('/cache/'));
  const withRemote = products.filter(p => p.image?.startsWith('http'));
  const withOther = products.filter(p => p.image && !p.image.startsWith('/cache/') && !p.image.startsWith('http'));

  console.log('\n=== IMAGE PATH ANALYSIS ===');
  console.log(`Total products checked: ${products.length}`);
  console.log(`With /cache/ paths: ${withCache.length}`);
  console.log(`With remote URLs: ${withRemote.length}`);
  console.log(`With other paths: ${withOther.length}`);

  console.log('\n=== SAMPLE PRODUCTS WITH /cache/ ===');
  withCache.slice(0, 3).forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Image: ${p.image}`);
    console.log('---');
  });

  console.log('\n=== SAMPLE PRODUCTS WITH REMOTE URLs ===');
  withRemote.slice(0, 3).forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Image: ${p.image}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkImageTypes().catch(console.error);
