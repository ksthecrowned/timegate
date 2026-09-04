-- Salary advances + variable source for auto payroll deduction
ALTER TYPE "PayrollVariableSource" ADD VALUE IF NOT EXISTS 'SALARY_ADVANCE';

CREATE TYPE "SalaryAdvanceStatus" AS ENUM ('PENDING', 'DISBURSED', 'DEDUCTED', 'CANCELLED');

CREATE TABLE "timegate_salary_advance" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "amount" DECIMAL(21,9) NOT NULL,
    "status" "SalaryAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(500),
    "paid_at" TIMESTAMP(3),
    "deducted_at" TIMESTAMP(3),
    "payroll_run" VARCHAR(140),
    "payroll_variable_item" VARCHAR(140),

    CONSTRAINT "timegate_salary_advance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timegate_salary_advance_payroll_variable_item_key" ON "timegate_salary_advance"("payroll_variable_item");
CREATE INDEX "timegate_salary_advance_company_employee_status_idx" ON "timegate_salary_advance"("company", "employee", "status");
CREATE INDEX "timegate_salary_advance_payroll_run_idx" ON "timegate_salary_advance"("payroll_run");

ALTER TABLE "timegate_salary_advance" ADD CONSTRAINT "timegate_salary_advance_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_salary_advance" ADD CONSTRAINT "timegate_salary_advance_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_salary_advance" ADD CONSTRAINT "timegate_salary_advance_payroll_run_fkey" FOREIGN KEY ("payroll_run") REFERENCES "timegate_payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timegate_salary_advance" ADD CONSTRAINT "timegate_salary_advance_payroll_variable_item_fkey" FOREIGN KEY ("payroll_variable_item") REFERENCES "timegate_payroll_variable_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
