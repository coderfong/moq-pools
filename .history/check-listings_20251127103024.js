const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function checkListings() {
  console.log('\n=== Checking Listings ===\n');
  
  const listings = await prisma.savedListing.findMany({
    where: {
      OR: [
        { title: { contains: 'Batter Dispenser' } },
        { title: { contains: 'Donut Shape' } }
      ]
    },
    select: {
      id: true,
      title: true,
      url: true
    }
  });
  
  console.log(`Found ${listings.length} listings:\n`);
  listings.forEach(l => {
    console.log(`ID: ${l.id}`);
    console.log(`  Title: ${l.title}`);
    console.log(`  URL: ${l.url}\n`);
  });
  
  await prisma.$disconnect();
}

checkListings().catch(console.error);
