-- CreateEnum
CREATE TYPE "TimeGateAttendanceAuthMethod" AS ENUM ('FACE', 'PIN', 'NFC', 'QR');

-- AlterTable
ALTER TABLE "timegate_attendance_event" ADD COLUMN "auth_method" "TimeGateAttendanceAuthMethod";

-- AlterTable
ALTER TABLE "tabEmployee" ADD COLUMN "nfc_badge_uid" VARCHAR(64),
ADD COLUMN "qr_punch_token_hash" VARCHAR(64),
ADD COLUMN "qr_punch_token_issued_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "tabEmployee_company_nfc_badge_uid_key" ON "tabEmployee"("company", "nfc_badge_uid");
