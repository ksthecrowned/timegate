-- Rotating QR (1 min slots): store HMAC secret instead of static token hash.
ALTER TABLE "tabEmployee" ADD COLUMN "qr_punch_secret" VARCHAR(88);
ALTER TABLE "tabEmployee" ADD COLUMN "qr_punch_secret_issued_at" TIMESTAMP(3);

UPDATE "tabEmployee" SET "qr_punch_token_hash" = NULL;

ALTER TABLE "tabEmployee" DROP COLUMN "qr_punch_token_hash";
ALTER TABLE "tabEmployee" DROP COLUMN "qr_punch_token_issued_at";
