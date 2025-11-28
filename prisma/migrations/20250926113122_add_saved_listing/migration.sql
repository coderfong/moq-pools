-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "priceRaw" TEXT,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "currency" TEXT,
    "moqRaw" TEXT,
    "moq" INTEGER,
    "storeName" TEXT,
    "description" TEXT,
    "categories" TEXT[],
    "terms" TEXT[],
    "ratingRaw" TEXT,
    "ordersRaw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedListing_url_key" ON "SavedListing"("url");

-- CreateIndex
CREATE INDEX "SavedListing_platform_idx" ON "SavedListing"("platform");

-- CreateIndex
CREATE INDEX "SavedListing_title_idx" ON "SavedListing"("title");
