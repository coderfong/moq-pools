const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function countListings() {
  try {
    // Check both ExternalListingCache and SavedListing tables
    const externalCount = await prisma.externalListingCache.count();
    const savedCount = await prisma.savedListing.count();
    
    const alibabaCount = await prisma.externalListingCache.count({
      where: { platform: 'ALIBABA' }
    });

    const madeInChinaCount = await prisma.externalListingCache.count({
      where: { platform: 'MADE_IN_CHINA' }
    });

    const totalCount = await prisma.externalListingCache.count();
    
    // Also count SavedListing
    const savedAlibaba = await prisma.savedListing.count({
      where: { platform: 'ALIBABA' }
    });
    
    const savedMIC = await prisma.savedListing.count({
      where: { platform: 'MADE_IN_CHINA' }
    });
    
    const savedIndiamart = await prisma.savedListing.count({
      where: { platform: 'INDIAMART' }
    });
    const savedIndiamart = await prisma.savedListing.count({
      where: { platform: 'INDIAMART' }
    });

    console.log('\n📊 Total Listing Counts:');
    console.log('═'.repeat(70));
    console.log(`ExternalListingCache:  ${externalCount.toLocaleString()} listings`);
    console.log(`SavedListing:          ${savedCount.toLocaleString()} listings`);
    console.log(`GRAND TOTAL:           ${(externalCount + savedCount).toLocaleString()} listings`);
    console.log('═'.repeat(70));

    console.log('\n📦 ExternalListingCache Breakdown:');
    console.log('─'.repeat(70));
    console.log(`Alibaba.com:      ${alibabaCount.toLocaleString()}`);
    console.log(`Made-in-China:    ${madeInChinaCount.toLocaleString()}`);
    console.log('─'.repeat(70));
    console.log(`Total:            ${totalCount.toLocaleString()}`);
    
    console.log('\n💾 SavedListing Breakdown:');
    console.log('─'.repeat(70));
    console.log(`Alibaba.com:      ${savedAlibaba.toLocaleString()}`);
    console.log(`Made-in-China:    ${savedMIC.toLocaleString()}`);
    console.log(`IndiaMART:        ${savedIndiamart.toLocaleString()}`);
    console.log('─'.repeat(70));
    console.log(`Total:            ${savedCount.toLocaleString()}`);
    console.log('═'.repeat(70));

    // Get category breakdown by checking ListingSearches
    console.log('\n📁 Category Breakdown by Search Queries:');
    console.log('═'.repeat(60));

    // Get all searches with their platforms and queries
    const searches = await prisma.listingSearch.findMany({
      select: {
        q: true,
        platform: true,
        total: true,
        items: {
          select: {
            listing: {
              select: {
                platform: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group by query (category) and platform
    const categoryMap = new Map();

    for (const search of searches) {
      for (const item of search.items) {
        const platform = item.listing.platform;
        const category = search.q;
        
        const key = `${platform}|${category}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { platform, category, count: 0 });
        }
        categoryMap.get(key).count++;
      }
    }

    // Sort and display
    const categories = Array.from(categoryMap.values());
    
    // Alibaba categories
    const alibabaCategories = categories.filter(c => c.platform === 'ALIBABA');
    if (alibabaCategories.length > 0) {
      console.log('\n� ALIBABA.COM:');
      alibabaCategories.sort((a, b) => b.count - a.count);
      alibabaCategories.forEach(({ category, count }) => {
        console.log(`  ${category.padEnd(35)} ${count.toString().padStart(5)}`);
      });
    }

    // Made-in-China categories
    const micCategories = categories.filter(c => c.platform === 'MADE_IN_CHINA');
    if (micCategories.length > 0) {
      console.log('\n🔸 MADE-IN-CHINA:');
      micCategories.sort((a, b) => b.count - a.count);
      micCategories.forEach(({ category, count }) => {
        console.log(`  ${category.padEnd(35)} ${count.toString().padStart(5)}`);
      });
    }

    // IndiaMART categories
    const indiamartCategories = categories.filter(c => c.platform === 'INDIAMART');
    if (indiamartCategories.length > 0) {
      console.log('\n🔸 INDIAMART:');
      indiamartCategories.sort((a, b) => b.count - a.count);
      indiamartCategories.forEach(({ category, count }) => {
        console.log(`  ${category.padEnd(35)} ${count.toString().padStart(5)}`);
      });
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countListings();
