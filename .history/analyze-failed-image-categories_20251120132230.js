const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeFailedCategories() {
  console.log('=== ANALYZING CATEGORIES OF FAILED IMAGE LISTINGS ===\n');
  
  // Get category breakdown of failed listings
  // Since categories is an array, we need to unnest it
  const categoryStats = await prisma.$queryRaw`
    SELECT 
      UNNEST(categories) as category,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (image LIKE 'https://placehold.co/%' OR image IS NULL OR image LIKE '/cache/%')
    GROUP BY UNNEST(categories)
    ORDER BY count DESC
  `;
  
  console.log('📊 CATEGORIES WITH FAILED IMAGES:\n');
  console.log('Category'.padEnd(50) + 'Count'.padEnd(10) + 'Percentage');
  console.log('='.repeat(70));
  
  categoryStats.forEach(stat => {
    const cat = stat.category || 'NULL/Uncategorized';
    console.log(
      cat.substring(0, 48).padEnd(50) + 
      stat.count.toString().padEnd(10) + 
      stat.percentage + '%'
    );
  });
  
  console.log('\n' + '='.repeat(70));
  console.log(`Total: ${categoryStats.reduce((sum, s) => sum + parseInt(s.count), 0)} listings`);
  
  // Get some sample listings from top categories
  console.log('\n\n📝 SAMPLE LISTINGS FROM TOP CATEGORIES:\n');
  
  for (let i = 0; i < Math.min(5, categoryStats.length); i++) {
    const cat = categoryStats[i];
    console.log(`\n--- ${cat.category || 'NULL'} (${cat.count} listings) ---`);
    
    const samples = await prisma.$queryRaw`
      SELECT title, url, "storeName" as supplier, image
      FROM "SavedListing"
      WHERE platform = 'MADE_IN_CHINA'
        AND (image LIKE 'https://placehold.co/%' OR image IS NULL OR image LIKE '/cache/%')
        AND ${cat.category} = ANY(categories)
      LIMIT 3
    `;
    
    samples.forEach((listing, idx) => {
      console.log(`  ${idx + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`     Supplier: ${listing.supplier || 'N/A'}`);
      console.log(`     URL: ${listing.url}`);
      console.log(`     Image: ${listing.image || 'NULL'}`);
    });
  }
  
  // Compare with successful listings
  console.log('\n\n📈 COMPARISON WITH SUCCESSFUL LISTINGS:\n');
  
  const comparison = await prisma.$queryRaw`
    SELECT 
      UNNEST(categories) as category,
      COUNT(CASE WHEN image LIKE 'https://placehold.co/%' OR image IS NULL OR image LIKE '/cache/%' THEN 1 END) as failed,
      COUNT(CASE WHEN image LIKE 'https://image.made-in-china.com/%' THEN 1 END) as success,
      COUNT(*) as total,
      ROUND(COUNT(CASE WHEN image LIKE 'https://placehold.co/%' OR image IS NULL OR image LIKE '/cache/%' THEN 1 END) * 100.0 / COUNT(*), 2) as fail_rate
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
    GROUP BY UNNEST(categories)
    HAVING COUNT(*) > 10
    ORDER BY fail_rate DESC
    LIMIT 10
  `;
  
  console.log('Category'.padEnd(50) + 'Failed'.padEnd(10) + 'Success'.padEnd(10) + 'Total'.padEnd(10) + 'Fail Rate');
  console.log('='.repeat(90));
  
  comparison.forEach(stat => {
    const cat = stat.category || 'NULL/Uncategorized';
    console.log(
      cat.substring(0, 48).padEnd(50) + 
      stat.failed.toString().padEnd(10) + 
      stat.success.toString().padEnd(10) + 
      stat.total.toString().padEnd(10) + 
      stat.fail_rate + '%'
    );
  });
  
  await prisma.$disconnect();
}

analyzeFailedCategories().catch(console.error);
