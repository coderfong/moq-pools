-- Add SourcePlatform enum and new Product columns.
-- NOTE: This migration assumes the enum and columns do not yet exist (fresh project).
-- If applying to an existing DB, adjust manually.

-- Create enum if not exists (PostgreSQL 9.6+ doesn't support IF NOT EXISTS directly on CREATE TYPE for enum).
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourcePlatform') THEN
		CREATE TYPE "SourcePlatform" AS ENUM (
		  'C1688',
		  'ALIBABA',
		  'TAOBAO',
		  'MADE_IN_CHINA',
		  'ALIEXPRESS',
		  'SEA_LOCAL'
		);
	END IF;
END $$;

-- Add columns to Product if they are missing
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name='Product' AND column_name='sourcePlatform'
	) THEN
		ALTER TABLE "Product" ADD COLUMN "sourcePlatform" "SourcePlatform" NOT NULL DEFAULT 'ALIBABA';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name='Product' AND column_name='sourceUrl'
	) THEN
		ALTER TABLE "Product" ADD COLUMN "sourceUrl" TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name='Product' AND column_name='sourceNotes'
	) THEN
		ALTER TABLE "Product" ADD COLUMN "sourceNotes" TEXT;
	END IF;
END $$;

-- Optional index to speed up filtering/grouping by sourcePlatform
CREATE INDEX IF NOT EXISTS "Product_sourcePlatform_idx" ON "Product" ("sourcePlatform");