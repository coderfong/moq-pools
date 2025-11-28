-- Re-add SourcePlatform enum and Product columns
CREATE TYPE "SourcePlatform" AS ENUM ('C1688','ALIBABA','TAOBAO','MADE_IN_CHINA','ALIEXPRESS','SEA_LOCAL');
ALTER TABLE "Product" ADD COLUMN "sourcePlatform" "SourcePlatform" NOT NULL DEFAULT 'ALIBABA';
ALTER TABLE "Product" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "sourceNotes" TEXT;
CREATE INDEX "Product_sourcePlatform_idx" ON "Product"("sourcePlatform");