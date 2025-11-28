const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'SavedListing' 
    ORDER BY ordinal_position
  `;
  
  console.log('SavedListing table columns in database:');
  cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
  
  await prisma.$disconnect();
}

checkSchema().catch(console.error);
