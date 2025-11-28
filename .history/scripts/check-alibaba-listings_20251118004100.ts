import { prisma } from '../src/lib/prisma';

async function checkAlibaba() {
  const listings = await prisma!.savedListing.findMany({
    where: { 
      platform: 'ALIBABA',
      url: { contains: 'alibaba.com' }
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceRaw: true,
      moqRaw: true,
      image: true,
      url: true
    },
    take: 10
  });
  
  console.log(JSON.stringify(listings, null, 2));
  process.exit(0);
}

checkAlibaba();
