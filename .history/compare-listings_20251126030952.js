const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function compareListings() {
  const [batter, donut] = await Promise.all([
    prisma.savedListing.findUnique({
      where: { id: 'cmg13wyz105uerdvr44gguwga' },
      select: { id: true, title: true, url: true }
    }),
    prisma.savedListing.findUnique({
      where: { id: 'cmg15besl07gerdvrqdo18ucp' },
      select: { id: true, title: true, url: true }
    })
  ]);
  
  console.log('\n=== Comparing Two Listings ===\n');
  console.log('Batter Dispenser Listing:');
  console.log('  ID:', batter.id);
  console.log('  Title:', batter.title);
  console.log('  URL:', batter.url);
  
  console.log('\nDonut Humidifier Listing (user purchased):');
  console.log('  ID:', donut.id);
  console.log('  Title:', donut.title);
  console.log('  URL:', donut.url);
  
  console.log('\nURLs Match?', batter.url === donut.url);
  
  await prisma.$disconnect();
}

compareListings().catch(console.error);
