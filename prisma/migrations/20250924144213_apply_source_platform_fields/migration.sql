/*
  Warnings:

  - You are about to drop the column `sourceNotes` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sourcePlatform` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Product_sourcePlatform_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sourceNotes",
DROP COLUMN "sourcePlatform",
DROP COLUMN "sourceUrl";

-- DropEnum
DROP TYPE "SourcePlatform";
