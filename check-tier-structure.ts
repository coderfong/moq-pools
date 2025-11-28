import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  // Check the diamond earrings listing
  const listing = await p.savedListing.findFirst({
    where: {
      title: { contains: '18k White Gold Stud Earrings Diamond' }
    },
    select: {
      id: true,
      title: true,
      detailJson: true
    }
  });
  
  console.log('=== Listing ===');
  console.log('Title:', listing?.title);
  console.log('DetailJson:', JSON.stringify(listing?.detailJson, null, 2));
  
  // Also check the camera detector that worked
  const working = await p.savedListing.findFirst({
    where: {
      title: { contains: '#1 Sales Hidden Camera Dector' }
    },
    select: {
      id: true,
      title: true,
      detailJson: true
    }
  });
  
  console.log('\n=== Working Listing ===');
  console.log('Title:', working?.title);
  console.log('DetailJson:', JSON.stringify(working?.detailJson, null, 2));
}

main()
  .finally(() => p.$disconnect());
