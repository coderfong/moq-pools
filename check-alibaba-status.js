const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  console.log('=== CHECKING CURRENT STATUS ===\n');
  
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) >= 10) as good,
      COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) BETWEEN 1 AND 9) as partial,
      COUNT(*) FILTER (WHERE "detailJson" IS NULL OR jsonb_array_length(COALESCE("detailJson"->'attributes', '[]'::jsonb)) = 0) as bad,
      COUNT(*) as total
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
  `;
  
  const s = stats[0];
  console.log(`Total Alibaba listings: ${Number(s.total)}`);
  console.log(`✅ Good (≥10 attributes): ${Number(s.good)}`);
  console.log(`⚠️  Partial (1-9 attributes): ${Number(s.partial)}`);
  console.log(`❌ Bad (0 attributes): ${Number(s.bad)}`);
  
  const needFix = Number(s.bad) + Number(s.partial);
  console.log(`\n📊 Still need fixing: ${needFix}`);
  
  // Check recent updates
  const recent = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('minute', "detailUpdatedAt") as minute,
      COUNT(*) as count
    FROM "SavedListing"
    WHERE platform = 'ALIBABA'
      AND "detailUpdatedAt" > NOW() - INTERVAL '1 hour'
    GROUP BY minute
    ORDER BY minute DESC
    LIMIT 10
  `;
  
  if (recent.length > 0) {
    console.log('\n📈 Recent updates (last hour):');
    recent.forEach(r => {
      console.log(`  ${r.minute.toISOString()}: ${Number(r.count)} listings`);
    });
  } else {
    console.log('\n⚠️  No updates in the last hour');
  }
  
  await prisma.$disconnect();
}

checkStatus().catch(console.error);
