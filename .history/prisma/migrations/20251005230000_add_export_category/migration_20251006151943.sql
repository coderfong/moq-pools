-- CreateTable
CREATE TABLE "ExportCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "parentLabel" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER,
    "hash" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExportCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExportCategory_url_key" ON "ExportCategory"("url");

-- CreateIndex
CREATE INDEX "ExportCategory_hash_idx" ON "ExportCategory"("hash");

-- Trigger-style lastSeen update via updatedAt equivalent
CREATE OR REPLACE FUNCTION set_export_category_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW."lastSeen" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER export_category_last_seen
BEFORE UPDATE ON "ExportCategory"
FOR EACH ROW
EXECUTE PROCEDURE set_export_category_last_seen();
