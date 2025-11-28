-- CreateTable
CREATE TABLE "ExternalListingCache" (
    "id" TEXT NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "priceRaw" TEXT,
    "currency" TEXT,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "moqRaw" TEXT,
    "moq" INTEGER,
    "ordersRaw" TEXT,
    "ratingRaw" TEXT,
    "storeName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalListingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSearch" (
    "id" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "filtersJson" TEXT,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSearchItem" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ListingSearchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalListingCache_url_key" ON "ExternalListingCache"("url");

-- CreateIndex
CREATE INDEX "ExternalListingCache_platform_idx" ON "ExternalListingCache"("platform");

-- CreateIndex
CREATE INDEX "ListingSearch_q_platform_createdAt_idx" ON "ListingSearch"("q", "platform", "createdAt");

-- CreateIndex
CREATE INDEX "ListingSearchItem_listingId_idx" ON "ListingSearchItem"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSearchItem_searchId_position_key" ON "ListingSearchItem"("searchId", "position");

-- AddForeignKey
ALTER TABLE "ListingSearchItem" ADD CONSTRAINT "ListingSearchItem_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ListingSearch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSearchItem" ADD CONSTRAINT "ListingSearchItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ExternalListingCache"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
