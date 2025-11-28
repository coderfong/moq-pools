const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function exportUrls() {
  console.log('Exporting Alibaba URLs that need fixing...\n');
  
  const listings = await prisma.$queryRaw`
    SELECT id, url, title
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
      )
    ORDER BY "createdAt" DESC
  `;
  
  console.log(`Found ${listings.length} URLs to export\n`);
  
  // Export as CSV
  const csv = ['id,url,title']
    .concat(listings.map(l => `${l.id},"${l.url}","${l.title.replace(/"/g, '""')}"`))
    .join('\n');
  
  fs.writeFileSync('alibaba-urls-to-scrape.csv', csv);
  console.log('✅ Exported to: alibaba-urls-to-scrape.csv');
  console.log(`\nSend this file to a scraping service like:`);
  console.log('- ScraperAPI.com');
  console.log('- Bright Data');
  console.log('- Apify.com');
  console.log('\nCost estimate: $500-2000 for 113K URLs');
  console.log('Time: 1-7 days\n');
  
  await prisma.$disconnect();
}

exportUrls().catch(console.error);
