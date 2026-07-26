-- Day-specific schedule overrides (exception > assignment weekdays)

CREATE TABLE IF NOT EXISTS "timegate_schedule_day_exception" (
  "id" VARCHAR(140) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "company" VARCHAR(140) NOT NULL,
  "employee" VARCHAR(140) NOT NULL,
  "work_date" DATE NOT NULL,
  "is_off" BOOLEAN NOT NULL DEFAULT false,
  "start_time" TIME,
  "end_time" TIME,
  "note" VARCHAR(255),

  CONSTRAINT "timegate_schedule_day_exception_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_schedule_day_exception_employee_work_date_key"
  ON "timegate_schedule_day_exception"("employee", "work_date");

CREATE INDEX IF NOT EXISTS "timegate_schedule_day_exception_company_work_date_idx"
  ON "timegate_schedule_day_exception"("company", "work_date");

ALTER TABLE "timegate_schedule_day_exception"
  ADD CONSTRAINT "timegate_schedule_day_exception_company_fkey"
  FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_schedule_day_exception"
  ADD CONSTRAINT "timegate_schedule_day_exception_employee_fkey"
  FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
