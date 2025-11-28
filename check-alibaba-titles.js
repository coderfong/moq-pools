const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get a few Alibaba listings to check their titles
  const listings = await prisma.savedListing.findMany({
    where: {
      platform: 'ALIBABA'
    },
    select: {
      id: true,
      title: true,
      url: true,
      detailJson: true
    },
    take: 10
  });

  console.log(`Found ${listings.length} Alibaba listings\n`);
  
  listings.forEach((listing, idx) => {
    console.log(`${idx + 1}. Title (${listing.title.length} chars):`);
    console.log(`   "${listing.title}"`);
    
    if (listing.detailJson && typeof listing.detailJson === 'object') {
      const detailTitle = listing.detailJson.title;
      if (detailTitle) {
        console.log(`   Detail Title (${detailTitle.length} chars):`);
        console.log(`   "${detailTitle}"`);
      }
    }
    
    console.log(`   URL: ${listing.url.substring(0, 80)}...`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
