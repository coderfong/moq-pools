import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const total = await p.savedListing.count({
    where: { platform: 'ALIBABA' }
  });
  
  const withDetailJson = await p.savedListing.count({
    where: {
      platform: 'ALIBABA',
      detailJson: { not: null }
    }
  });
  
  const withPriceTiers = await p.savedListing.count({
    where: {
      platform: 'ALIBABA',
      detailJson: { path: ['priceTiers'], not: null }
    }
  });
  
  console.log('Total Alibaba listings:', total);
  console.log('With detailJson:', withDetailJson, `(${(withDetailJson/total*100).toFixed(1)}%)`);
  console.log('With priceTiers:', withPriceTiers, `(${(withPriceTiers/total*100).toFixed(1)}%)`);
  
  // Sample some with tiers
  const samples = await p.savedListing.findMany({
    where: {
      platform: 'ALIBABA',
      detailJson: { path: ['priceTiers'], not: null }
    },
    select: {
      title: true,
      detailJson: true
    },
    take: 3
  });
  
  console.log('\nSample listings with tiers:');
  for (const s of samples) {
    console.log('\nTitle:', s.title);
    console.log('Tiers:', JSON.stringify((s.detailJson as any)?.priceTiers, null, 2));
  }
}

main()
  .finally(() => p.$disconnect());
