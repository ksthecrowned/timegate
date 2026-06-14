-- CreateTable
CREATE TABLE "timegate_late_record" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "record_date" DATE NOT NULL,
    "record_at" TIMESTAMP(3) NOT NULL,
    "lateness_minutes" INTEGER NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(500),
    "justification_file_url" VARCHAR(2000),
    "attendance" VARCHAR(140),
    "timesheet_day" VARCHAR(140),

    CONSTRAINT "timegate_late_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_absence_record" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "record_date" DATE NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(500),
    "justification_file_url" VARCHAR(2000),
    "attendance" VARCHAR(140),

    CONSTRAINT "timegate_absence_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timegate_late_record_employee_record_date_key" ON "timegate_late_record"("employee", "record_date");
CREATE UNIQUE INDEX "timegate_late_record_timesheet_day_key" ON "timegate_late_record"("timesheet_day");
CREATE INDEX "timegate_late_record_company_record_date_idx" ON "timegate_late_record"("company", "record_date");

CREATE UNIQUE INDEX "timegate_absence_record_employee_record_date_key" ON "timegate_absence_record"("employee", "record_date");
CREATE UNIQUE INDEX "timegate_absence_record_attendance_key" ON "timegate_absence_record"("attendance");
CREATE INDEX "timegate_absence_record_company_record_date_idx" ON "timegate_absence_record"("company", "record_date");

-- AddForeignKey
ALTER TABLE "timegate_late_record" ADD CONSTRAINT "timegate_late_record_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_late_record" ADD CONSTRAINT "timegate_late_record_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_late_record" ADD CONSTRAINT "timegate_late_record_timesheet_day_fkey" FOREIGN KEY ("timesheet_day") REFERENCES "timegate_timesheet_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timegate_absence_record" ADD CONSTRAINT "timegate_absence_record_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_absence_record" ADD CONSTRAINT "timegate_absence_record_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
