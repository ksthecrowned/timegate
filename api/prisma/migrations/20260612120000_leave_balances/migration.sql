-- Leave balances: max days per type + per-employee yearly allocation

ALTER TABLE "tabLeave Type" ADD COLUMN IF NOT EXISTS "max_days_per_year" INTEGER;

CREATE TABLE IF NOT EXISTS "tabLeave Allocation" (
  "id" VARCHAR(140) NOT NULL,
  "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modified" TIMESTAMP(3) NOT NULL,
  "employee" VARCHAR(140) NOT NULL,
  "leave_type" VARCHAR(140) NOT NULL,
  "year" INTEGER NOT NULL,
  "allocated_days" DECIMAL(6,2) NOT NULL,
  CONSTRAINT "tabLeave Allocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tabLeave Allocation_employee_leave_type_year_key"
  ON "tabLeave Allocation"("employee", "leave_type", "year");

ALTER TABLE "tabLeave Allocation"
  ADD CONSTRAINT "tabLeave Allocation_employee_fkey"
  FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tabLeave Allocation"
  ADD CONSTRAINT "tabLeave Allocation_leave_type_fkey"
  FOREIGN KEY ("leave_type") REFERENCES "tabLeave Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
