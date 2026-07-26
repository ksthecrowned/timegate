-- Exceptions tied to shift type (planning), not employee

DELETE FROM "timegate_schedule_day_exception";

DROP INDEX IF EXISTS "timegate_schedule_day_exception_employee_work_date_key";

ALTER TABLE "timegate_schedule_day_exception"
  DROP CONSTRAINT IF EXISTS "timegate_schedule_day_exception_employee_fkey";

ALTER TABLE "timegate_schedule_day_exception"
  DROP COLUMN IF EXISTS "employee";

ALTER TABLE "timegate_schedule_day_exception"
  ADD COLUMN IF NOT EXISTS "shift_type" VARCHAR(140);

-- Require shift_type for remaining rows (table cleared above)
ALTER TABLE "timegate_schedule_day_exception"
  ALTER COLUMN "shift_type" SET NOT NULL;

ALTER TABLE "timegate_schedule_day_exception"
  ADD CONSTRAINT "timegate_schedule_day_exception_shift_type_fkey"
  FOREIGN KEY ("shift_type") REFERENCES "tabShift Type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_schedule_day_exception_shift_type_work_date_key"
  ON "timegate_schedule_day_exception"("shift_type", "work_date");
