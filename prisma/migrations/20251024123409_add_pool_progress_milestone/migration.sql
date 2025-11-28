-- CreateEnum
CREATE TYPE "ProgressMilestone" AS ENUM ('NONE', 'FIFTY', 'NINETY', 'MOQ');

-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "lastProgressMilestone" "ProgressMilestone" NOT NULL DEFAULT 'NONE';
