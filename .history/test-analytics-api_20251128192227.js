const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAnalyticsAPI() {
  try {
    console.log('Testing fixed analytics queries...');
    
    // Test the fixed categories query
    const topCategoriesQuery = `
      SELECT 
        CASE 
          WHEN LOWER(p."title") LIKE '%electronics%' OR LOWER(p."title") LIKE '%phone%' OR LOWER(p."title") LIKE '%computer%' THEN 'Electronics'
          WHEN LOWER(p."title") LIKE '%kitchen%' OR LOWER(p."title") LIKE '%home%' OR LOWER(p."title") LIKE '%furniture%' OR LOWER(p."title") LIKE '%dispenser%' THEN 'Home & Kitchen'
          WHEN LOWER(p."title") LIKE '%fashion%' OR LOWER(p."title") LIKE '%clothing%' OR LOWER(p."title") LIKE '%wear%' THEN 'Fashion'
          WHEN LOWER(p."title") LIKE '%tool%' OR LOWER(p."title") LIKE '%machine%' OR LOWER(p."title") LIKE '%equipment%' THEN 'Tools & Hardware'
          WHEN LOWER(p."title") LIKE '%beauty%' OR LOWER(p."title") LIKE '%cosmetic%' OR LOWER(p."title") LIKE '%skin%' THEN 'Beauty'
          WHEN LOWER(p."title") LIKE '%sport%' OR LOWER(p."title") LIKE '%fitness%' OR LOWER(p."title") LIKE '%outdoor%' THEN 'Sports & Outdoors'
          ELSE 'General Products'
        END as category,
        COUNT(*) as pool_count
      FROM "Pool" po
      LEFT JOIN "Product" p ON po."productId" = p."id"
      GROUP BY 
        CASE 
          WHEN LOWER(p."title") LIKE '%electronics%' OR LOWER(p."title") LIKE '%phone%' OR LOWER(p."title") LIKE '%computer%' THEN 'Electronics'
          WHEN LOWER(p."title") LIKE '%kitchen%' OR LOWER(p."title") LIKE '%home%' OR LOWER(p."title") LIKE '%furniture%' OR LOWER(p."title") LIKE '%dispenser%' THEN 'Home & Kitchen'
          WHEN LOWER(p."title") LIKE '%fashion%' OR LOWER(p."title") LIKE '%clothing%' OR LOWER(p."title") LIKE '%wear%' THEN 'Fashion'
          WHEN LOWER(p."title") LIKE '%tool%' OR LOWER(p."title") LIKE '%machine%' OR LOWER(p."title") LIKE '%equipment%' THEN 'Tools & Hardware'
          WHEN LOWER(p."title") LIKE '%beauty%' OR LOWER(p."title") LIKE '%cosmetic%' OR LOWER(p."title") LIKE '%skin%' THEN 'Beauty'
          WHEN LOWER(p."title") LIKE '%sport%' OR LOWER(p."title") LIKE '%fitness%' OR LOWER(p."title") LIKE '%outdoor%' THEN 'Sports & Outdoors'
          ELSE 'General Products'
        END
      ORDER BY pool_count DESC
      LIMIT 5;
    `;
    
    const topCategories = await prisma.$queryRawUnsafe(topCategoriesQuery);
    console.log('Top Categories:', topCategories);
    
    console.log('Analytics API queries test completed successfully!');
    
  } catch (error) {
    console.error('Error testing analytics API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalyticsAPI();