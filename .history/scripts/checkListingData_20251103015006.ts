import { prisma } from '../src/lib/prisma';

async function main() {
  const listingId = 'cmh3ff4vr02gzp39bxeqroofa';
  
  const listing = await prisma.savedListing.findUnique({
    where: { id: listingId },
    select: {
      title: true,
      image: true,
      priceRaw: true,
      priceMin: true,
      priceMax: true,
      currency: true,
      moqRaw: true,
      moq: true,
      storeName: true,
      url: true,
    }
  });
  
  if (!listing) {
    console.log('❌ Listing not found');
    return;
  }
  
  console.log('✅ Listing data:');
  console.log('   Title:', listing.title);
  console.log('   Store:', listing.storeName || '(not set)');
  console.log('   Price Raw:', listing.priceRaw || '(not set)');
  console.log('   Price Min:', listing.priceMin || '(not set)');
  console.log('   Price Max:', listing.priceMax || '(not set)');
  console.log('   Currency:', listing.currency || '(not set)');
  console.log('   MOQ Raw:', listing.moqRaw || '(not set)');
  console.log('   MOQ:', listing.moq || '(not set)');
  console.log('   Image:', listing.image || '(not set)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
