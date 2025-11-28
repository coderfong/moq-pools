const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOne() {
  console.log('=== TESTING ONE LISTING SCRAPE ===\n');
  
  const url = 'https://www.alibaba.com/product-detail/3mm-Pastel-Acrylic-Sheet-1-8_1601418331741.html';
  console.log(`URL: ${url}\n`);
  
  try {
    console.log('Calling re-scrape API...');
    const response = await fetch('http://localhost:3007/api/rescrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        listingId: 'test',
        url: url,
        directUrl: true
      })
    });
    
    const result = await response.json();
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
  }
  
  await prisma.$disconnect();
}

testOne().catch(console.error);
