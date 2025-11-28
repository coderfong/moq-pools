const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAlibabaListings() {
  console.log('=== ALIBABA LISTINGS ANALYSIS ===\n');
  
  // Total count
  const totalResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "SavedListing" WHERE platform = 'ALIBABA'
  `;
  const total = Number(totalResult[0].count);
  
  // Good (≥10 attributes)
  const goodResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'ALIBABA' 
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10
  `;
  const good = Number(goodResult[0].count);
  
  // Partial (1-9 attributes)
  const partialResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'ALIBABA' 
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 1 AND 9
  `;
  const partial = Number(partialResult[0].count);
  
  // Bad (0 attributes but has detailJson)
  const badResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'ALIBABA' 
      AND "detailJson" IS NOT NULL
      AND jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0
  `;
  const bad = Number(badResult[0].count);
  
  // Missing (no detailJson)
  const missingResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "SavedListing" 
    WHERE platform = 'ALIBABA' 
      AND "detailJson" IS NULL
  `;
  const missing = Number(missingResult[0].count);
  
  console.log('Current Status:');
  console.log('─'.repeat(50));
  console.log(`✅ Good (≥10 attributes):     ${good.toLocaleString().padStart(8)}`);
  console.log(`⚠️  Partial (1-9 attributes):  ${partial.toLocaleString().padStart(8)}`);
  console.log(`❌ Bad (0 attributes):        ${bad.toLocaleString().padStart(8)}`);
  console.log(`🔴 Missing (no detailJson):   ${missing.toLocaleString().padStart(8)}`);
  console.log('─'.repeat(50));
  console.log(`📊 Total:                     ${total.toLocaleString().padStart(8)}`);
  console.log('─'.repeat(50));
  
  const needFix = partial + bad + missing;
  const percentGood = ((good / total) * 100).toFixed(1);
  
  console.log(`\n🎯 Quality Score: ${percentGood}% (${good.toLocaleString()}/${total.toLocaleString()})`);
  console.log(`🔧 Need Fixing: ${needFix.toLocaleString()} listings`);
  
  if (needFix > 0) {
    console.log('\n📋 Recommended Actions:');
    if (partial > 0) {
      console.log(`   1. Run: node retry-alibaba-problematic.js --category=PARTIAL`);
      console.log(`      → Fix ${partial.toLocaleString()} partial listings`);
    }
    if (bad > 0) {
      console.log(`   2. Run: node retry-alibaba-problematic.js --category=BAD`);
      console.log(`      → Fix ${bad.toLocaleString()} bad listings`);
    }
    if (missing > 0) {
      console.log(`   3. Run: node retry-alibaba-problematic.js --category=MISSING`);
      console.log(`      → Fix ${missing.toLocaleString()} missing listings`);
    }
  } else {
    console.log('\n🎉 All listings are in good condition!');
  }
  
  await prisma.$disconnect();
}

analyzeAlibabaListings().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
