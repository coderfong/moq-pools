const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const total = await prisma.savedListing.count({ 
      where: { platform: 'MADE_IN_CHINA' } 
    });
    console.log(`\n=== Made-in-China Data Check ===`);
    console.log(`Total listings in SavedListing table: ${total}`);
    
    const samples = await prisma.savedListing.findMany({ 
      where: { platform: 'MADE_IN_CHINA' }, 
      take: 5,
      select: { 
        title: true, 
        url: true,
        priceRaw: true,
        image: true
      } 
    });
    
    console.log(`\nSample listings:`);
    samples.forEach((l, i) => {
      console.log(`\n${i+1}. ${l.title || 'NO TITLE'}`);
      console.log(`   Price: ${l.priceRaw || 'NO PRICE'}`);
      console.log(`   Image: ${l.image ? 'Yes' : 'No'}`);
    });
    
    console.log(`\n✅ Data is in database!`);
    console.log(`\nNow check: http://localhost:3007/products?platform=MADE_IN_CHINA\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
