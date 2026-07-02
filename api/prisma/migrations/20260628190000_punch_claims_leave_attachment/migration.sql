-- Lot F: réclamations pointage + justificatif congé

CREATE TYPE "TimeGatePunchClaimType" AS ENUM (
  'EARLY_DEPARTURE',
  'MISSED_CHECKOUT',
  'BREAK_NOT_TAKEN',
  'OTHER'
);

CREATE TYPE "TimeGatePunchClaimStatus" AS ENUM (
  'OPEN',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "timegate_punch_claim" (
  "id" VARCHAR(140) NOT NULL,
  "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modified" TIMESTAMP(3) NOT NULL,
  "company" VARCHAR(140) NOT NULL,
  "employee" VARCHAR(140) NOT NULL,
  "work_date" DATE NOT NULL,
  "type" "TimeGatePunchClaimType" NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "status" "TimeGatePunchClaimStatus" NOT NULL DEFAULT 'OPEN',
  "timesheet_day" VARCHAR(140),
  "reviewed_by" VARCHAR(140),
  "reviewed_at" TIMESTAMP(3),
  "review_note" VARCHAR(500),

  CONSTRAINT "timegate_punch_claim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timegate_punch_claim_company_status_idx" ON "timegate_punch_claim"("company", "status");
CREATE INDEX "timegate_punch_claim_employee_work_date_idx" ON "timegate_punch_claim"("employee", "work_date");

ALTER TABLE "timegate_punch_claim"
  ADD CONSTRAINT "timegate_punch_claim_company_fkey"
  FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_punch_claim"
  ADD CONSTRAINT "timegate_punch_claim_employee_fkey"
  FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_punch_claim"
  ADD CONSTRAINT "timegate_punch_claim_timesheet_day_fkey"
  FOREIGN KEY ("timesheet_day") REFERENCES "timegate_timesheet_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timegate_punch_claim"
  ADD CONSTRAINT "timegate_punch_claim_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabLeave Application"
  ADD COLUMN IF NOT EXISTS "support_document_url" VARCHAR(500);
