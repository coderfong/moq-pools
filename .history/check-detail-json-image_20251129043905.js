const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetailJson() {
  const listings = await prisma.savedListing.findMany({
    where: {
      image: { startsWith: '/cache/' }
    },
    select: {
      id: true,
      title: true,
      image: true,
      detailJson: true,
    },
    take: 3,
  });

  console.log('\n=== LISTINGS WITH /cache/ IMAGES ===');
  console.log(`Found ${listings.length} listings\n`);

  for (const listing of listings) {
    console.log(`ID: ${listing.id}`);
    console.log(`Title: ${listing.title?.substring(0, 60)}...`);
    console.log(`Image: ${listing.image}`);
    console.log(`DetailJson:`, typeof listing.detailJson === 'string' ? listing.detailJson.substring(0, 200) : JSON.stringify(listing.detailJson).substring(0, 200));
    
    if (listing.detailJson) {
      try {
        const detail = typeof listing.detailJson === 'string' ? JSON.parse(listing.detailJson) : listing.detailJson;
        console.log(`  - Has images array:`, !!detail.images);
        if (detail.images && detail.images.length > 0) {
          console.log(`  - First image:`, detail.images[0]);
        }
        console.log(`  - Has image field:`, !!detail.image);
        if (detail.image) {
          console.log(`  - Image field:`, detail.image);
        }
      } catch (e) {
        console.log(`  - Error parsing detailJson:`, e.message);
      }
    }
    console.log('---\n');
  }

  await prisma.$disconnect();
}

checkDetailJson().catch(console.error);
