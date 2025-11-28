const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetailJson() {
  const product = await prisma.savedListing.findFirst({
    where: { 
      platform: 'MADE_IN_CHINA',
      detailJson: { not: null }
    },
    select: { 
      url: true, 
      title: true,
      detailJson: true
    }
  });
  
  if (product) {
    console.log('URL:', product.url);
    console.log('Title:', product.title);
    console.log('\n=== detailJson ===');
    
    const detail = typeof product.detailJson === 'string' 
      ? JSON.parse(product.detailJson) 
      : product.detailJson;
    
    console.log(JSON.stringify(detail, null, 2));
  } else {
    console.log('No Made-in-China products found with detailJson');
  }
}

checkDetailJson()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
