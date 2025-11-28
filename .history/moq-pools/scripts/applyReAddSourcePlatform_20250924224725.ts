import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){
  try {
    console.log('Applying manual re-add of SourcePlatform...');
    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourcePlatform') THEN
        CREATE TYPE "SourcePlatform" AS ENUM ('C1688','ALIBABA','TAOBAO','MADE_IN_CHINA','ALIEXPRESS','SEA_LOCAL');
      END IF;
    END $$;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourcePlatform" "SourcePlatform" NOT NULL DEFAULT 'ALIBABA';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceNotes" TEXT;`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_sourcePlatform_idx" ON "Product"("sourcePlatform");`);
    console.log('Done.');
  } finally { await prisma.$disconnect(); }
}
main().catch(e=>{console.error(e);process.exit(1);});