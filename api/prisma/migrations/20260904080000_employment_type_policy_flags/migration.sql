-- Employment type policy flags (payroll inclusion, leave accrual, pay mode).
CREATE TYPE "EmploymentPayMode" AS ENUM ('MONTHLY', 'FLAT');

ALTER TABLE "tabEmployment Type"
  ADD COLUMN "include_in_payroll" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "accrues_leave" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pay_mode" "EmploymentPayMode" NOT NULL DEFAULT 'MONTHLY';
