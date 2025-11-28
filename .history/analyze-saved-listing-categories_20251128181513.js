const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeSavedListingCategories() {
  try {
    console.log('\n📊 SavedListing Category Analysis');
    console.log('═'.repeat(80));

    // Get total counts first
    const totalCounts = await Promise.all([
      prisma.savedListing.count({ where: { platform: 'ALIBABA' } }),
      prisma.savedListing.count({ where: { platform: 'MADE_IN_CHINA' } }),
      prisma.savedListing.count({ where: { platform: 'INDIAMART' } })
    ]);

    console.log(`\nTotal SavedListing counts:`);
    console.log(`  ALIBABA:        ${totalCounts[0].toLocaleString()}`);
    console.log(`  MADE-IN-CHINA:  ${totalCounts[1].toLocaleString()}`);
    console.log(`  INDIAMART:      ${totalCounts[2].toLocaleString()}`);
    console.log(`  TOTAL:          ${(totalCounts[0] + totalCounts[1] + totalCounts[2]).toLocaleString()}`);

    // Analyze categories from SavedListing
    console.log('\n📁 Category Breakdown (from SavedListing.categories field):');
    console.log('═'.repeat(80));

    // Get all listings with their categories
    const listingsWithCategories = await prisma.savedListing.findMany({
      select: {
        platform: true,
        categories: true
      },
      where: {
        categories: {
          isEmpty: false
        }
      }
    });

    // Process categories by platform
    const categoryStats = {
      ALIBABA: new Map(),
      MADE_IN_CHINA: new Map(),
      INDIAMART: new Map()
    };

    for (const listing of listingsWithCategories) {
      if (!listing.categories || !Array.isArray(listing.categories)) continue;
      
      const platform = listing.platform;
      if (!categoryStats[platform]) continue;

      for (const category of listing.categories) {
        const categoryName = typeof category === 'string' ? category : JSON.stringify(category);
        const currentCount = categoryStats[platform].get(categoryName) || 0;
        categoryStats[platform].set(categoryName, currentCount + 1);
      }
    }

    // Display results for each platform
    for (const [platform, categoryMap] of Object.entries(categoryStats)) {
      if (categoryMap.size === 0) continue;

      console.log(`\n🔸 ${platform}:`);
      const sortedCategories = Array.from(categoryMap.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50); // Top 50 categories

      for (const [category, count] of sortedCategories) {
        console.log(`  ${category.padEnd(40)} ${count.toString().padStart(6)}`);
      }
    }

    // Alternative analysis: derive categories from search terms or titles
    console.log('\n\n📊 Alternative Analysis: Categories from Search Terms');
    console.log('═'.repeat(80));

    // Get search terms that were used to find these listings
    const searchTermAnalysis = await prisma.$queryRaw`
      SELECT 
        sl.platform,
        ls.q as search_term,
        COUNT(*) as listing_count
      FROM "SavedListing" sl
      INNER JOIN "ListingSearchItem" lsi ON sl.id = lsi."listingId"
      INNER JOIN "ListingSearch" ls ON lsi."searchId" = ls.id
      WHERE sl.platform IN ('ALIBABA', 'MADE_IN_CHINA', 'INDIAMART')
      GROUP BY sl.platform, ls.q
      ORDER BY sl.platform, listing_count DESC
    `;

    // Group by platform
    const platformSearchTerms = {
      ALIBABA: [],
      MADE_IN_CHINA: [],
      INDIAMART: []
    };

    for (const row of searchTermAnalysis) {
      const platform = row.platform;
      if (platformSearchTerms[platform]) {
        platformSearchTerms[platform].push({
          term: row.search_term,
          count: Number(row.listing_count)
        });
      }
    }

    // Display search term analysis
    for (const [platform, terms] of Object.entries(platformSearchTerms)) {
      if (terms.length === 0) continue;

      console.log(`\n🔍 ${platform} (by search terms used):`);
      terms.slice(0, 50).forEach(({ term, count }) => {
        console.log(`  ${term.padEnd(40)} ${count.toString().padStart(6)}`);
      });
    }

    // Summary statistics
    console.log('\n\n📈 Summary Statistics:');
    console.log('═'.repeat(80));
    
    const listingsWithCategoriesCount = listingsWithCategories.length;
    const totalListings = totalCounts[0] + totalCounts[1] + totalCounts[2];
    const categorizedPercent = ((listingsWithCategoriesCount / totalListings) * 100).toFixed(2);

    console.log(`Total listings with categories: ${listingsWithCategoriesCount.toLocaleString()}`);
    console.log(`Total listings: ${totalListings.toLocaleString()}`);
    console.log(`Categorized percentage: ${categorizedPercent}%`);

    // Check if we need to analyze other fields for category info
    console.log('\n📋 Sample listing structure analysis...');
    
    const sampleListings = await prisma.savedListing.findMany({
      take: 3,
      select: {
        platform: true,
        title: true,
        categories: true,
        detailJson: true
      },
      where: {
        platform: 'MADE_IN_CHINA',
        detailJson: {
          not: null
        }
      }
    });

    sampleListings.forEach((listing, i) => {
      console.log(`\nSample ${i + 1} (${listing.platform}):`);
      console.log(`  Title: ${listing.title?.substring(0, 60)}...`);
      console.log(`  Categories field: ${JSON.stringify(listing.categories)}`);
      
      if (listing.detailJson) {
        const detail = typeof listing.detailJson === 'string' 
          ? JSON.parse(listing.detailJson) 
          : listing.detailJson;
        
        if (detail.category) {
          console.log(`  DetailJson category: ${JSON.stringify(detail.category)}`);
        }
        if (detail.breadcrumbs) {
          console.log(`  DetailJson breadcrumbs: ${JSON.stringify(detail.breadcrumbs)}`);
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSavedListingCategories();