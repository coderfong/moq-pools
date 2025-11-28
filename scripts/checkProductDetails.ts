import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Checking products with detailJson...\n');
  
  const products = await prisma.product.findMany({
    where: {
      detailJson: { not: null }
    },
    select: {
      sourceUrl: true,
      detailJson: true
    },
    take: 3
  });

  console.log(`Found ${products.length} products with detailJson\n`);
  
  for (const p of products) {
    console.log('\n===================');
    console.log('URL:', p.sourceUrl);
    console.log('DetailJson:', JSON.stringify(p.detailJson, null, 2));
  }
  
  // Also check a specific pool's product
  console.log('\n\n=== Checking specific pool product ===');
  const poolProduct = await prisma.product.findFirst({
    where: {
      pool: {
        id: 'cmh6fosku03xw5sozkwk4erq0'
      }
    },
    select: {
      sourceUrl: true,
      detailJson: true,
      savedListing: {
        select: {
          title: true,
          platform: true,
          priceRaw: true
        }
      }
    }
  });
  
  if (poolProduct) {
    console.log('Pool Product URL:', poolProduct.sourceUrl);
    console.log('SavedListing:', poolProduct.savedListing);
    console.log('DetailJson:', JSON.stringify(poolProduct.detailJson, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
