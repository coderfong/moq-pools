import { prisma } from '../src/lib/prisma';

async function main() {
  const listingId = 'cmh3ff4vr02gzp39bxeqroofa';
  
  const listing = await prisma.savedListing.findUnique({
    where: { id: listingId },
    select: {
      title: true,
      detailJson: true,
      detailUpdatedAt: true,
    }
  });
  
  if (!listing) {
    console.log('❌ Listing not found');
    return;
  }
  
  console.log('✅ Listing:', listing.title);
  console.log('   Detail Updated:', listing.detailUpdatedAt || '(never)');
  
  if (listing.detailJson) {
    const detail = typeof listing.detailJson === 'string' 
      ? JSON.parse(listing.detailJson) 
      : listing.detailJson;
    
    console.log('\n📦 Detail Data:');
    console.log('   Supplier:', detail.supplier?.name || '(not set)');
    console.log('   Price Min:', detail.priceMin || '(not set)');
    console.log('   Price Max:', detail.priceMax || '(not set)');
    console.log('   MOQ:', detail.moq || '(not set)');
    console.log('   MOQ Text:', detail.moqText || '(not set)');
    console.log('   Currency:', detail.currency || '(not set)');
    console.log('   Price Text:', detail.priceText || '(not set)');
    console.log('   Attributes:', detail.attributes?.length || 0, 'items');
  } else {
    console.log('\n❌ No detailJson available - needs refresh');
    console.log('   Run: /pools/' + listingId + '?refresh=1');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
