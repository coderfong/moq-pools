const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.savedListing.findMany({
    where: { platform: 'ALIBABA' },
    select: {
      title: true,
      detailJson: true
    },
    take: 20
  });
  
  const withDetails = all.filter(l => l.detailJson !== null);
  const withoutDetails = all.filter(l => l.detailJson === null);
  
  console.log('Sample of 20 Alibaba listings:');
  console.log('With detailJson:', withDetails.length);
  console.log('Without detailJson:', withoutDetails.length);
  
  if (withDetails.length > 0) {
    console.log('\n✓ Example with details:');
    console.log('  Title field:', withDetails[0].title);
    console.log('  Detail title:', withDetails[0].detailJson?.title || 'N/A');
  }
  
  if (withoutDetails.length > 0) {
    console.log('\n✗ Examples without details:');
    withoutDetails.slice(0, 3).forEach(l => {
      console.log('  -', l.title);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
