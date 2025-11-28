-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('GROUP_UPDATE', 'SHIPPING', 'PROMOTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_userId_status_timestamp_idx" ON "Alert"("userId", "status", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_userId_type_timestamp_idx" ON "Alert"("userId", "type", "timestamp");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
