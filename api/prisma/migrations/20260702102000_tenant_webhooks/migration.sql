-- Lot H #4 - Webhooks tenant
ALTER TABLE "timegate_system_settings"
  ADD COLUMN IF NOT EXISTS "webhook_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "webhook_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "webhook_secret" VARCHAR(255);
