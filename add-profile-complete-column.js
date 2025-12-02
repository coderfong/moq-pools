const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function addColumn() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileComplete" BOOLEAN NOT NULL DEFAULT false;'
    );
    console.log('✅ Column profileComplete added successfully');
    
    // Also set existing users with passwordHash to profileComplete=true (registered via form)
    const result = await prisma.$executeRaw`
      UPDATE "User" 
      SET "profileComplete" = true 
      WHERE "passwordHash" IS NOT NULL;
    `;
    console.log(`✅ Updated ${result} existing users to profileComplete=true`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();
