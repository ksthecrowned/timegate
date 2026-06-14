-- CreateEnum
CREATE TYPE "TimeGateTimesheetDayStatus" AS ENUM ('OPEN', 'CLOSED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "timegate_timesheet_day" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "work_date" DATE NOT NULL,
    "worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "TimeGateTimesheetDayStatus" NOT NULL DEFAULT 'OPEN',
    "rule_version" VARCHAR(32) NOT NULL DEFAULT 'v1',
    "anomaly_flags" JSONB,

    CONSTRAINT "timegate_timesheet_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_timesheet_override" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timesheet_day" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "manager_user" VARCHAR(140),
    "reason" VARCHAR(500) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "timegate_timesheet_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timegate_timesheet_day_employee_work_date_key" ON "timegate_timesheet_day"("employee", "work_date");
CREATE INDEX "timegate_timesheet_day_company_work_date_idx" ON "timegate_timesheet_day"("company", "work_date");
CREATE INDEX "timegate_timesheet_override_timesheet_day_creation_idx" ON "timegate_timesheet_override"("timesheet_day", "creation");

-- AddForeignKey
ALTER TABLE "timegate_timesheet_day" ADD CONSTRAINT "timegate_timesheet_day_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_timesheet_day" ADD CONSTRAINT "timegate_timesheet_day_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_timesheet_override" ADD CONSTRAINT "timegate_timesheet_override_timesheet_day_fkey" FOREIGN KEY ("timesheet_day") REFERENCES "timegate_timesheet_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_timesheet_override" ADD CONSTRAINT "timegate_timesheet_override_manager_user_fkey" FOREIGN KEY ("manager_user") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
