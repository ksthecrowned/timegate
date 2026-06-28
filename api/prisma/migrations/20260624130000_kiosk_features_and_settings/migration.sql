-- Lot A: méthodes kiosk + seuils PIN tenant
ALTER TABLE "tabTimeGate Kiosk"
  ADD COLUMN "face_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "nfc_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qr_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "timegate_system_settings"
  ADD COLUMN "pin_failure_threshold" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "pin_failure_cooldown_seconds" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "default_shift_type" VARCHAR(140);

ALTER TABLE "timegate_system_settings"
  ADD CONSTRAINT "timegate_system_settings_default_shift_type_fkey"
  FOREIGN KEY ("default_shift_type") REFERENCES "tabShift Type"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
