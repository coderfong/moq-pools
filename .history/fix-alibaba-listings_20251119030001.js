const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function fixAlibabaListings() {
  try {
    console.log('='.repeat(80));
    console.log('FIXING ALIBABA LISTINGS WITH INCOMPLETE DATA');
    console.log('='.repeat(80));
    
    // Find all Alibaba listings
    const allAlibaba = await prisma.savedListing.findMany({
      where: { platform: 'ALIBABA' },
      select: {
        id: true,
        url: true,
        title: true,
        priceRaw: true,
        detailJson: true,
        detailUpdatedAt: true
      }
    });
    
    console.log(`\nTotal Alibaba listings: ${allAlibaba.length}`);
    
    // Classify them
    const needsFix = [];
    const good = [];
    
    for (const listing of allAlibaba) {
      if (!listing.detailJson) {
        needsFix.push({ ...listing, reason: 'No detailJson' });
        continue;
      }
      
      const detail = listing.detailJson;
      const hasAttributes = detail.attributes && detail.attributes.length > 0;
      const hasPriceTiers = detail.priceTiers && detail.priceTiers.length > 0;
      const hasSupplier = detail.supplier && detail.supplier.name;
      const hasPackaging = detail.packaging && detail.packaging.length > 0;
      
      // Check if title has .html suffix
      const hasHtmlSuffix = listing.title && /\d{8,}\.html?\s*$/i.test(listing.title);
      
      if (!hasAttributes || !hasPriceTiers || !hasSupplier || hasHtmlSuffix) {
        needsFix.push({
          ...listing,
          reason: [
            !hasAttributes && 'no attributes',
            !hasPriceTiers && 'no price tiers',
            !hasSupplier && 'no supplier',
            !hasPackaging && 'no packaging',
            hasHtmlSuffix && 'bad title'
          ].filter(Boolean).join(', ')
        });
      } else {
        good.push(listing);
      }
    }
    
    console.log(`\n✅ Good listings: ${good.length}`);
    console.log(`❌ Need fixing: ${needsFix.length}`);
    
    if (needsFix.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('LISTINGS THAT NEED FIXING:');
      console.log('='.repeat(80));
      
      needsFix.slice(0, 20).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title?.substring(0, 60)}...`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Reason: ${listing.reason}`);
        console.log(`   URL: ${listing.url?.substring(0, 80)}...`);
      });
      
      if (needsFix.length > 20) {
        console.log(`\n... and ${needsFix.length - 20} more`);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('READY TO FIX');
      console.log('='.repeat(80));
      console.log(`\nWill re-scrape ${needsFix.length} listings with headless mode.`);
      console.log('This may take a while...\n');
      
      // Import the refresh function
      const { refreshProductDetail } = await import('./src/lib/providers/detail.ts');
      
      let fixed = 0;
      let failed = 0;
      
      for (let i = 0; i < needsFix.length; i++) {
        const listing = needsFix[i];
        const progress = `[${i + 1}/${needsFix.length}]`;
        
        console.log(`${progress} Processing: ${listing.title?.substring(0, 50)}...`);
        
        try {
          const detail = await refreshProductDetail(listing);
          
          if (detail && detail.attributes && detail.attributes.length > 0) {
            console.log(`  ✅ Fixed - got ${detail.attributes.length} attributes, ${detail.priceTiers?.length || 0} tiers`);
            fixed++;
          } else {
            console.log(`  ⚠️  Scraped but got minimal data`);
            failed++;
          }
          
          // Rate limit: wait 2 seconds between requests to avoid being blocked
          if (i < needsFix.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
          failed++;
        }
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('SUMMARY');
      console.log('='.repeat(80));
      console.log(`Total processed: ${needsFix.length}`);
      console.log(`Successfully fixed: ${fixed}`);
      console.log(`Failed: ${failed}`);
      console.log('\n✨ Done! Reload your pool pages to see the updated data.\n');
    } else {
      console.log('\n✅ All Alibaba listings are in good shape!\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixAlibabaListings();
