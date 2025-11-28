const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function testAlibabaScrape() {
  try {
    // Get an Alibaba listing without detail
    const listing = await prisma.savedListing.findFirst({
      where: {
        platform: 'ALIBABA',
        OR: [
          { detailJson: { equals: null } },
          { detailUpdatedAt: null }
        ]
      },
      select: {
        id: true,
        url: true,
        title: true,
        priceRaw: true,
        detailJson: true
      }
    });

    if (!listing) {
      console.log('No Alibaba listings found without detail');
      return;
    }

    console.log('Testing listing:', listing.id);
    console.log('URL:', listing.url);
    console.log('Title:', listing.title);
    console.log('Price:', listing.priceRaw);
    console.log('\nAttempting to fetch detail...\n');

    // Try to fetch detail
    const { fetchProductDetail } = await import('./src/lib/providers/detail.ts');
    const detail = await fetchProductDetail(listing.url);

    if (!detail) {
      console.log('❌ Detail fetch returned null');
      console.log('\nThis means:');
      console.log('1. The URL might be invalid');
      console.log('2. Alibaba is blocking the request');
      console.log('3. The scraper failed to parse the page');
      console.log('\nTry setting SCRAPE_HEADLESS=1 in your .env file');
    } else {
      console.log('✅ Detail fetched successfully!');
      console.log('\nDetail data:');
      console.log('Title:', detail.title);
      console.log('Price Text:', detail.priceText);
      console.log('MOQ Text:', detail.moqText);
      console.log('Price Tiers:', detail.priceTiers?.length || 0);
      console.log('Attributes:', detail.attributes?.length || 0);
      console.log('Packaging:', detail.packaging?.length || 0);
      console.log('Debug:', detail.debug);
      console.log('\nFull detail:');
      console.log(JSON.stringify(detail, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAlibabaScrape();
