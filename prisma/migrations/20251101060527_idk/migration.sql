-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('OK', 'WEAK');

-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SavedListing" ADD COLUMN     "lastScrapeStatus" "ScrapeStatus";

-- CreateIndex
CREATE INDEX "PoolItem_userId_createdAt_idx" ON "PoolItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_trackingNo_idx" ON "Shipment"("trackingNo");

-- RenameForeignKey
ALTER TABLE "Alert" RENAME CONSTRAINT "Alert_assignee_fkey" TO "Alert_assigneeId_fkey";
