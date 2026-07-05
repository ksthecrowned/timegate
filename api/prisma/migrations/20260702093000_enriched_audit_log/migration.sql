-- Lot H #1 - Journal d'audit enrichi
ALTER TABLE "timegate_audit_log"
  ADD COLUMN IF NOT EXISTS "branch" VARCHAR(140),
  ADD COLUMN IF NOT EXISTS "request_id" VARCHAR(140),
  ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "timegate_audit_log_branch_created_at_idx"
  ON "timegate_audit_log" ("branch", "createdAt");
