-- Lot B: fenêtres de pointage configurables par type d'horaire
ALTER TABLE "tabShift Type"
  ADD COLUMN "check_in_window_start" TIME,
  ADD COLUMN "check_in_window_end" TIME,
  ADD COLUMN "check_out_window_start" TIME,
  ADD COLUMN "check_out_window_end" TIME,
  ADD COLUMN "break_window_start" TIME,
  ADD COLUMN "break_window_end" TIME,
  ADD COLUMN "break_duration_minutes" INTEGER DEFAULT 60;
