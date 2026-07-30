ALTER TABLE "timegate_system_settings"
ADD COLUMN IF NOT EXISTS "allow_checkin_after_break_start" BOOLEAN NOT NULL DEFAULT true;

