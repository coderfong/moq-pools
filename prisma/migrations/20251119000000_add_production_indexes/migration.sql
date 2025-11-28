-- Production Performance Indexes
-- Critical for 267K+ listings and efficient queries

-- Enable pg_trgm extension for fuzzy text search (MUST be first)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- SavedListing indexes for search and filtering
CREATE INDEX IF NOT EXISTS "SavedListing_platform_idx" ON "SavedListing"("platform");
CREATE INDEX IF NOT EXISTS "SavedListing_updatedAt_idx" ON "SavedListing"("updatedAt");
CREATE INDEX IF NOT EXISTS "SavedListing_platform_updatedAt_idx" ON "SavedListing"("platform", "updatedAt");

-- Full-text search on SavedListing title and description (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "SavedListing_title_trgm_idx" ON "SavedListing" USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SavedListing_description_trgm_idx" ON "SavedListing" USING gin(description gin_trgm_ops);

-- User email lookup (authentication)
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- ExternalListingCache platform filter
CREATE INDEX IF NOT EXISTS "ExternalListingCache_platform_idx" ON "ExternalListingCache"("platform");
CREATE INDEX IF NOT EXISTS "ExternalListingCache_updatedAt_idx" ON "ExternalListingCache"("updatedAt");

-- ListingSearch query performance
CREATE INDEX IF NOT EXISTS "ListingSearch_q_platform_createdAt_idx" ON "ListingSearch"("q", "platform", "createdAt");

-- Message conversation queries
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_senderUserId_idx" ON "Message"("senderUserId");

-- ConversationParticipant lookups
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- Alert queries by user and status
CREATE INDEX IF NOT EXISTS "Alert_userId_status_timestamp_idx" ON "Alert"("userId", "status", "timestamp");
CREATE INDEX IF NOT EXISTS "Alert_userId_type_timestamp_idx" ON "Alert"("userId", "type", "timestamp");
CREATE INDEX IF NOT EXISTS "Alert_triageStatus_timestamp_idx" ON "Alert"("triageStatus", "timestamp");

-- PushToken user lookup
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

-- ProductView history
CREATE INDEX IF NOT EXISTS "ProductView_userId_viewedAt_idx" ON "ProductView"("userId", "viewedAt");
CREATE INDEX IF NOT EXISTS "ProductView_savedListingId_idx" ON "ProductView"("savedListingId");

-- Shipment tracking
CREATE INDEX IF NOT EXISTS "Shipment_trackingNo_idx" ON "Shipment"("trackingNo");

-- PoolItem user history
CREATE INDEX IF NOT EXISTS "PoolItem_userId_createdAt_idx" ON "PoolItem"("userId", "createdAt");

-- ExportCategory hash lookup
CREATE INDEX IF NOT EXISTS "ExportCategory_hash_idx" ON "ExportCategory"("hash");

-- Composite index for SavedListing searches with categories
CREATE INDEX IF NOT EXISTS "SavedListing_categories_gin_idx" ON "SavedListing" USING gin("categories");
CREATE INDEX IF NOT EXISTS "SavedListing_terms_gin_idx" ON "SavedListing" USING gin("terms");
