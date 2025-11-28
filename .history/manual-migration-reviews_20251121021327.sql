-- Manual Migration: Add Review System
-- Safe to run - only creates NEW tables, doesn't touch existing data
-- Date: 2025-11-21

-- Create Review table
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "poolId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "images" TEXT[],
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create ReviewHelpfulVote table
CREATE TABLE IF NOT EXISTS "ReviewHelpfulVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHelpfulVote_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Review table
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");
CREATE INDEX IF NOT EXISTS "Review_poolId_idx" ON "Review"("poolId");
CREATE INDEX IF NOT EXISTS "Review_rating_idx" ON "Review"("rating");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

-- Create indexes for ReviewHelpfulVote table
CREATE INDEX IF NOT EXISTS "ReviewHelpfulVote_userId_idx" ON "ReviewHelpfulVote"("userId");

-- Create unique constraint for one vote per user per review
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewHelpfulVote_reviewId_userId_key" ON "ReviewHelpfulVote"("reviewId", "userId");

-- Add foreign key constraints
ALTER TABLE "Review" 
ADD CONSTRAINT "Review_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "User"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

ALTER TABLE "ReviewHelpfulVote" 
ADD CONSTRAINT "ReviewHelpfulVote_reviewId_fkey" 
FOREIGN KEY ("reviewId") 
REFERENCES "Review"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Verification queries (run after migration to check)
-- SELECT COUNT(*) as review_count FROM "Review";
-- SELECT COUNT(*) as vote_count FROM "ReviewHelpfulVote";
-- \d "Review"
-- \d "ReviewHelpfulVote"
