-- P2 configuration tenant: méthodes kiosque, délais notifs, politique offline

ALTER TABLE "timegate_system_settings"
  ADD COLUMN IF NOT EXISTS "default_face_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "default_nfc_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "default_qr_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notification_unclosed_reminder_delay_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "notification_review_reminder_min_age_minutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS "allow_offline_sync" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "offline_sync_max_age_minutes" INTEGER NOT NULL DEFAULT 720;
