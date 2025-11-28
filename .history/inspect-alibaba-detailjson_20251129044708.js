const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function inspect() {
  const listing = await prisma.savedListing.findFirst({
    where: {
      platform: 'ALIBABA',
      detailJson: { not: null }
    }
  });
  
  if (listing) {
    console.log('Sample Alibaba listing detailJson structure:');
    console.log(JSON.stringify(listing.detailJson, null, 2));
  } else {
    console.log('No Alibaba listings with detailJson found');
  }
  
  await prisma.$disconnect();
}

inspect();
