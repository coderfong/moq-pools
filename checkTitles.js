const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.savedListing.findMany({
    where: {
      url: {
        contains: 'Men-Cotton-Co-Ord-Shirt-and'
      }
    },
    select: {
      id: true,
      title: true,
      url: true,
      detailJson: true
    },
    take: 5
  });
  
  console.log('SavedListing records:');
  listings.forEach(l => {
    console.log('\n---');
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('URL:', l.url);
    console.log('Has detailJson:', !!l.detailJson);
    if (l.detailJson) {
      console.log('Detail title:', l.detailJson.title || 'N/A');
    }
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
