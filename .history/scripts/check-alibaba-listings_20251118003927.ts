import { prisma } from '../src/lib/prisma';

async function checkAlibaba() {
  const listings = await prisma!.savedListing.findMany({
    where: { platform: 'ALIBABA' },
    select: {
      id: true,
      title: true,
      price: true,
      moq: true,
      image: true,
      url: true
    },
    take: 5
  });
  
  console.log(JSON.stringify(listings, null, 2));
  process.exit(0);
}

checkAlibaba();
