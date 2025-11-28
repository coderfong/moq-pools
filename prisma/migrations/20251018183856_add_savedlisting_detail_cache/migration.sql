-- AlterTable
ALTER TABLE "SavedListing" ADD COLUMN     "detailJson" JSONB,
ADD COLUMN     "detailUpdatedAt" TIMESTAMP(3);
