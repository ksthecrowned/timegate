-- Allow multiple kiosks per branch / location
DROP INDEX IF EXISTS "tabTimeGate Kiosk_branch_key";
CREATE INDEX IF NOT EXISTS "tabTimeGate Kiosk_branch_idx" ON "tabTimeGate Kiosk"("branch");
CREATE INDEX IF NOT EXISTS "tabTimeGate Kiosk_location_idx" ON "tabTimeGate Kiosk"("location");
