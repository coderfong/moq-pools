-- Optional trigram indexes for fuzzy search, if you enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Speed LIKE/ILIKE queries on titles and descriptions
CREATE INDEX IF NOT EXISTS ext_listing_title_trgm ON "ExternalListingCache" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ext_listing_desc_trgm  ON "ExternalListingCache" USING gin (description gin_trgm_ops);
