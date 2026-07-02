-- Lot E: politique timesheet tenant + alerte heures sup

ALTER TABLE "timegate_system_settings"
  ADD COLUMN IF NOT EXISTS "timesheet_rounding_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overtime_alert_threshold_minutes" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS "min_minutes_between_shifts" INTEGER NOT NULL DEFAULT 660;

ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'OVERTIME_THRESHOLD';
