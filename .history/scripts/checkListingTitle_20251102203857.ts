import { prisma } from '../src/lib/prisma';

async function checkTitle() {
  const url = 'https://www.alibaba.com/product-detail/Wholesale-Walker-Ultra-Hold-Glue-Hair_1601369025072.html';
  
  const listing = await prisma.savedListing.findFirst({
    where: { url },
    select: { id: true, title: true, url: true }
  });
  
  console.log('Listing found:', listing);
  
  await prisma.$disconnect();
}

checkTitle().catch(console.error);
