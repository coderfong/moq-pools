import { prisma } from '../src/lib/prisma';

async function checkDetailJson() {
  const listing = await prisma!.savedListing.findFirst({
    where: { 
      platform: 'ALIBABA',
      url: { contains: 'alibaba.com' },
      detailJson: { not: null }
    },
    select: {
      id: true,
      title: true,
      url: true,
      priceRaw: true,
      detailJson: true
    }
  });
  
  if (listing) {
    console.log('Title:', listing.title);
    console.log('Price Raw:', listing.priceRaw);
    console.log('\nDetail JSON:');
    console.log(JSON.stringify(listing.detailJson, null, 2));
  } else {
    console.log('No Alibaba listing with detailJson found');
  }
  
  process.exit(0);
}

checkDetailJson();
