-- Lot A : logs tentatives refusées + source employee-app + auth MOBILE

ALTER TYPE "TimeGateAttendanceEventSource" ADD VALUE 'EMPLOYEE_APP';
ALTER TYPE "TimeGateAttendanceAuthMethod" ADD VALUE 'MOBILE';

CREATE TABLE "timegate_punch_attempt_log" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140),
    "branch" VARCHAR(140),
    "kiosk" VARCHAR(140),
    "source" "TimeGateAttendanceEventSource",
    "auth_method" "TimeGateAttendanceAuthMethod",
    "outcome" VARCHAR(32) NOT NULL,
    "message" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "timegate_punch_attempt_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timegate_punch_attempt_log_company_created_at_idx" ON "timegate_punch_attempt_log"("company", "created_at");
CREATE INDEX "timegate_punch_attempt_log_employee_created_at_idx" ON "timegate_punch_attempt_log"("employee", "created_at");

ALTER TABLE "timegate_punch_attempt_log" ADD CONSTRAINT "timegate_punch_attempt_log_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_punch_attempt_log" ADD CONSTRAINT "timegate_punch_attempt_log_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timegate_punch_attempt_log" ADD CONSTRAINT "timegate_punch_attempt_log_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
