-- Tenant defaults for break windows (prefill new shift types)

ALTER TABLE "timegate_system_settings"
  ADD COLUMN IF NOT EXISTS "default_break_window_start" VARCHAR(5) DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS "default_break_window_end" VARCHAR(5) DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS "default_break_duration_minutes" INTEGER NOT NULL DEFAULT 60;
