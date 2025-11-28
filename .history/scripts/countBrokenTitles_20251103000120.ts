import { prisma } from '../src/lib/prisma';

async function countBrokenTitles() {
  const allListings = await prisma!.savedListing.findMany({
    where: {
      url: { contains: 'made-in-china.com' },
    },
    select: {
      title: true,
    },
  });

  const brokenPattern = /^\d+\s*\/\s*\d+$/;
  const brokenCount = allListings.filter(listing => brokenPattern.test(listing.title)).length;

  console.log(`Total Made-in-China listings: ${allListings.length}`);
  console.log(`Remaining broken titles: ${brokenCount}`);
  
  if (brokenCount > 0) {
    console.log('\nRun: pnpm tsx scripts/fixMadeInChinaTitles.ts');
  } else {
    console.log('\n✅ All titles fixed!');
  }
}

countBrokenTitles()
  .catch(console.error)
  .finally(() => prisma?.$disconnect());
