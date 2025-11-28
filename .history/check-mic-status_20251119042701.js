const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMadeInChina() {
  console.log('=== MADE IN CHINA DETAILED ANALYSIS ===\n');
  
  // Total count
  const total = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'MADE_IN_CHINA'
  `;
  const totalCount = Number(total[0].count);
  
  console.log(`📊 Total Made-in-China listings: ${totalCount}\n`);
  
  // Count by attribute levels
  const byAttributes = await prisma.$queryRaw`
    SELECT 
      CASE 
        WHEN "detailJson" IS NULL THEN 'No detailJson'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0 THEN '0 attributes'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 1 AND 4 THEN '1-4 attributes (very poor)'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 5 AND 9 THEN '5-9 attributes (poor)'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 10 AND 14 THEN '10-14 attributes (partial)'
        WHEN jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 15 AND 19 THEN '15-19 attributes (good)'
        ELSE '20+ attributes (excellent)'
      END as category,
      COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
    GROUP BY category
    ORDER BY 
      CASE category
        WHEN 'No detailJson' THEN 1
        WHEN '0 attributes' THEN 2
        WHEN '1-4 attributes (very poor)' THEN 3
        WHEN '5-9 attributes (poor)' THEN 4
        WHEN '10-14 attributes (partial)' THEN 5
        WHEN '15-19 attributes (good)' THEN 6
        ELSE 7
      END
  `;
  
  console.log('📈 Breakdown by Attribute Count:');
  console.log('─'.repeat(60));
  byAttributes.forEach(row => {
    const pct = ((Number(row.count) / totalCount) * 100).toFixed(2);
    console.log(`${row.category.padEnd(35)} ${String(row.count).padStart(10)} (${pct}%)`);
  });
  console.log('─'.repeat(60));
  
  // Sample listings with different attribute counts
  console.log('\n📋 Sample Listings:\n');
  
  const samples = await prisma.$queryRaw`
    SELECT 
      title,
      url,
      jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) as attr_count,
      "detailJson"->'attributes' as attributes
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND "detailJson" IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 5
  `;
  
  samples.forEach((listing, i) => {
    console.log(`${i + 1}. ${listing.title.substring(0, 60)}...`);
    console.log(`   URL: ${listing.url.substring(0, 80)}...`);
    console.log(`   Attributes: ${listing.attr_count || 0}`);
    if (listing.attributes && listing.attr_count > 0) {
      const attrs = JSON.parse(JSON.stringify(listing.attributes));
      console.log('   Sample attributes:');
      attrs.slice(0, 3).forEach(attr => {
        console.log(`     • ${attr.name}: ${attr.value}`);
      });
    }
    console.log('');
  });
  
  // Count "good" listings (10+ attributes)
  const good = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  const goodCount = Number(good[0].count);
  
  const needFix = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND (
        "detailJson" IS NULL 
        OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) < 10
      )
  `;
  const needFixCount = Number(needFix[0].count);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total listings:           ${totalCount}`);
  console.log(`✅ Good (≥10 attributes): ${goodCount} (${((goodCount/totalCount)*100).toFixed(2)}%)`);
  console.log(`❌ Need fixing (<10):     ${needFixCount} (${((needFixCount/totalCount)*100).toFixed(2)}%)`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Check typical attribute structure
  const withAttrs = await prisma.$queryRaw`
    SELECT "detailJson"->'attributes' as attributes
    FROM "SavedListing"
    WHERE platform = 'MADE_IN_CHINA'
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) > 10
    LIMIT 1
  `;
  
  if (withAttrs.length > 0 && withAttrs[0].attributes) {
    console.log('📝 Example of good listing attributes:');
    const attrs = JSON.parse(JSON.stringify(withAttrs[0].attributes));
    attrs.slice(0, 10).forEach(attr => {
      console.log(`   ${attr.name}: ${attr.value}`);
    });
  }
  
  await prisma.$disconnect();
}

analyzeMadeInChina().catch(console.error);
