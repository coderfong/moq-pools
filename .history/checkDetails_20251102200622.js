const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.savedListing.count();
  const withDetails = await prisma.savedListing.count({
    where: {
      NOT: {
        detailJson: null
      }
    }
  });
  const withoutDetails = total - withDetails;
  
  console.log('Total SavedListings:', total);
  console.log('With detailJson:', withDetails);
  console.log('Without detailJson:', withoutDetails);
  console.log('Percentage missing:', ((withoutDetails / total) * 100).toFixed(1) + '%');
  
  // Sample some without details
  const samples = await prisma.savedListing.findMany({
    where: {
      detailJson: null,
      platform: 'ALIBABA'
    },
    select: {
      title: true,
      url: true
    },
    take: 5
  });
  
  console.log('\nSample listings without details:');
  samples.forEach(s => {
    console.log('-', s.title);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
