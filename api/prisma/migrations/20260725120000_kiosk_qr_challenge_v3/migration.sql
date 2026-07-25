-- Kiosk QR challenge v3 (employee scans kiosk)
ALTER TABLE "tabTimeGate Kiosk" ADD COLUMN IF NOT EXISTS "qr_challenge_secret" VARCHAR(88);

CREATE TABLE IF NOT EXISTS "timegate_qr_challenge" (
  "id" VARCHAR(140) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kiosk" VARCHAR(140) NOT NULL,
  "nonce" VARCHAR(32) NOT NULL,
  "slot" INTEGER NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "redeemed_at" TIMESTAMP(3),
  "employee" VARCHAR(140),
  "client_id" VARCHAR(140),
  "result_json" JSONB,
  CONSTRAINT "timegate_qr_challenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_qr_challenge_kiosk_nonce_key" ON "timegate_qr_challenge"("kiosk", "nonce");
CREATE UNIQUE INDEX IF NOT EXISTS "timegate_qr_challenge_client_id_key" ON "timegate_qr_challenge"("client_id");
CREATE INDEX IF NOT EXISTS "timegate_qr_challenge_kiosk_expires_at_idx" ON "timegate_qr_challenge"("kiosk", "expires_at");

ALTER TABLE "timegate_qr_challenge"
  DROP CONSTRAINT IF EXISTS "timegate_qr_challenge_kiosk_fkey";
ALTER TABLE "timegate_qr_challenge"
  ADD CONSTRAINT "timegate_qr_challenge_kiosk_fkey"
  FOREIGN KEY ("kiosk") REFERENCES "tabTimeGate Kiosk"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
