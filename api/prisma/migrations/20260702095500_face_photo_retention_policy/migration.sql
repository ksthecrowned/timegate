-- Lot H #3 - Retention photos faciales (RGPD)
ALTER TABLE "timegate_system_settings"
  ADD COLUMN IF NOT EXISTS "face_log_photo_retention_days" INTEGER NOT NULL DEFAULT 30;
