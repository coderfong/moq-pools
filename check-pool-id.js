const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPoolId() {
  const id = 'cmh7y5ul70iri5sozufsthb0e';
  
  console.log(`Checking for listing ID: ${id}\n`);
  
  try {
    const listing = await prisma.savedListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        platform: true,
        url: true,
        createdAt: true,
      }
    });
    
    if (listing) {
      console.log('✅ Listing found:');
      console.log(JSON.stringify(listing, null, 2));
    } else {
      console.log('❌ Listing not found');
      
      // Check if there are any listings at all
      const count = await prisma.savedListing.count();
      console.log(`\nTotal SavedListing records in database: ${count}`);
      
      // Get a sample ID
      const sample = await prisma.savedListing.findFirst({
        select: { id: true, title: true }
      });
      
      if (sample) {
        console.log(`\nSample listing ID: ${sample.id}`);
        console.log(`Sample URL: https://www.moqpools.com/pools/${sample.id}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPoolId();
