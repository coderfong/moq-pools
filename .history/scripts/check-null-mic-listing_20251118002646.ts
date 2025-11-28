import { prisma } from '@/lib/prisma';

async function check() {
  const listing = await prisma!.savedListing.findFirst({
    where: { 
      platform: 'MADE_IN_CHINA',
      image: null 
    },
    select: { 
      id: true, 
      title: true, 
      url: true 
    }
  });
  
  console.log(JSON.stringify(listing, null, 2));
  process.exit(0);
}

check();
