const { PrismaClient } = require('../prisma/generated/client4');
const https = require('https');
const http = require('http');
const prisma = new PrismaClient();

// Use Node's http module instead of fetch
async function fetchAlibabaDetailHtml(url) {
  return new Promise((resolve, reject) => {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `http://localhost:3007/api/external/detail-html?src=${encodedUrl}`;
    
    http.get(apiUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          console.error(`Failed to parse response for ${url}:`, error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error(`HTTP error for ${url}:`, error.message);
      resolve(null);
    });
  });
}

async function main() {
  console.log('Finding Alibaba listings without detailJson...\n');
  
  // First get all listings, then filter in JavaScript since Prisma has issues with JSON null checks
  const allListings = await prisma.savedListing.findMany({
    where: {
      platform: 'ALIBABA'
    },
    select: {
      id: true,
      url: true,
      title: true,
      detailJson: true
    }
  });
  
  const listings = allListings
    .filter(l => l.detailJson === null)
    .slice(0, 50); // Process 50 at a time
  
  console.log(`Found ${listings.length} listings to update\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const listing of listings) {
    console.log(`Processing: ${listing.title}`);
    console.log(`URL: ${listing.url}`);
    
    const detail = await fetchAlibabaDetailHtml(listing.url);
    
    if (detail && detail.title) {
      console.log(`✓ Got full title: ${detail.title}`);
      
      try {
        await prisma.savedListing.update({
          where: { id: listing.id },
          data: {
            detailJson: detail,
            detailUpdatedAt: new Date()
          }
        });
        updated++;
        console.log(`✓ Updated database\n`);
      } catch (error) {
        console.error(`✗ Failed to update database:`, error.message, '\n');
        failed++;
      }
    } else {
      console.log(`✗ Failed to fetch details\n`);
      failed++;
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total processed: ${listings.length}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
