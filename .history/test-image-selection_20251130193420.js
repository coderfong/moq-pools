const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function testImageSelection() {
  const listing = await prisma.savedListing.findFirst({
    where: {
      platform: 'ALIBABA',
      detailJson: { not: null },
      image: { startsWith: '/cache/' }
    }
  });
  
  if (!listing) {
    console.log('No listing found');
    return;
  }
  
  console.log('Current image:', listing.image);
  console.log('\nGallery images:');
  if (listing.detailJson.gallery) {
    listing.detailJson.gallery.forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
  }
  console.log('\nHero image:', listing.detailJson.heroImage);
  
  // Apply the selection logic
  let originalUrl = null;
  const detail = listing.detailJson;
  
  if (detail.gallery && detail.gallery.length > 0) {
    // Find larger resolution images, prioritizing 350x350 or full size
    originalUrl = detail.gallery.find(url => 
      url.includes('alicdn.com') && 
      (url.includes('_350x350') || url.includes('.jpg') && !url.includes('_')) &&
      !url.includes('_80x80') &&
      !url.includes('_50x50') &&
      !url.includes('_120x120') &&
      !url.includes('tps-960-102')
    );
    
    if (!originalUrl) {
      originalUrl = detail.gallery.find(url => 
        url.includes('alicdn.com') && 
        !url.includes('_80x80') &&
        !url.includes('_50x50') &&
        !url.includes('tps-960-102')
      );
    }
    
    if (!originalUrl) {
      originalUrl = detail.gallery[0];
    }
  } else if (detail.heroImage) {
    originalUrl = detail.heroImage;
  }
  
  if (originalUrl && originalUrl.includes('_80x80')) {
    originalUrl = originalUrl.replace('_80x80', '_350x350');
  }
  
  console.log('\nSelected URL:', originalUrl);
  
  await prisma.$disconnect();
}

testImageSelection();
