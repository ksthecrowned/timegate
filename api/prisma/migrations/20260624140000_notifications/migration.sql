-- CreateEnum
CREATE TYPE "TimeGateNotificationType" AS ENUM (
  'PUNCH_CHECK_IN',
  'PUNCH_CHECK_OUT',
  'PUNCH_BREAK',
  'PUNCH_REVIEW_REQUIRED',
  'PUNCH_LATE',
  'ABSENCE_AUTO',
  'UNCLOSED_CHECK_IN',
  'UNCLOSED_CHECK_IN_REMINDER'
);

-- CreateTable
CREATE TABLE "timegate_notification" (
  "id" VARCHAR(140) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company" VARCHAR(140) NOT NULL,
  "user" VARCHAR(140) NOT NULL,
  "type" "TimeGateNotificationType" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "meta" JSONB,

  CONSTRAINT "timegate_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timegate_notification_user_read_at_idx" ON "timegate_notification"("user", "read_at");

-- CreateIndex
CREATE INDEX "timegate_notification_user_created_at_idx" ON "timegate_notification"("user", "created_at");

-- CreateIndex
CREATE INDEX "timegate_notification_company_type_idx" ON "timegate_notification"("company", "type");

-- AddForeignKey
ALTER TABLE "timegate_notification" ADD CONSTRAINT "timegate_notification_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_notification" ADD CONSTRAINT "timegate_notification_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
