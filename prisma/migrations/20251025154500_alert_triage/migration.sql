-- Prisma migration for Alert triage fields
-- Note: This assumes PostgreSQL and a default table name of "Alert".
-- Adjust schema/namespace if needed.

-- Create enum type for triage status
DO $$ BEGIN
  CREATE TYPE "AlertTriageStatus" AS ENUM ('OPEN','RESOLVED','ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns (nullable where appropriate)
ALTER TABLE "Alert"
  ADD COLUMN IF NOT EXISTS "triageStatus" "AlertTriageStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "adminNotes" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "assigneeId" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "priority" BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();

-- Add FK for assignee (User)
DO $$ BEGIN
  ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignee_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Alert_triageStatus_timestamp_idx" ON "Alert" ("triageStatus", "timestamp");
