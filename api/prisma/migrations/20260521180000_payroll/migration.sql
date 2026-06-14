-- CreateEnum
CREATE TYPE "TimeGateSalaryStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "TimeGatePayrollRunStatus" AS ENUM ('DRAFT', 'LOCKED', 'PAID');

-- CreateTable
CREATE TABLE "timegate_salary_record" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "base_salary" DECIMAL(21,9) NOT NULL,
    "bonuses" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(21,9) NOT NULL,
    "status" "TimeGateSalaryStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "notes" VARCHAR(500),

    CONSTRAINT "timegate_salary_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_payroll_run" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "TimeGatePayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "rule_version" VARCHAR(32) NOT NULL DEFAULT 'v1',
    "locked_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "timegate_payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_payroll_line" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payroll_run" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "base_salary" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "overtime_amount" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "penalty_amount" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "absence_amount" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "bonus_amount" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(21,9) NOT NULL DEFAULT 0,
    "explain_json" JSONB,

    CONSTRAINT "timegate_payroll_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timegate_salary_record_employee_year_month_key" ON "timegate_salary_record"("employee", "year", "month");
CREATE INDEX "timegate_salary_record_company_year_month_idx" ON "timegate_salary_record"("company", "year", "month");

CREATE UNIQUE INDEX "timegate_payroll_run_company_year_month_key" ON "timegate_payroll_run"("company", "year", "month");

CREATE UNIQUE INDEX "timegate_payroll_line_payroll_run_employee_key" ON "timegate_payroll_line"("payroll_run", "employee");
CREATE INDEX "timegate_payroll_line_company_idx" ON "timegate_payroll_line"("company");

-- AddForeignKey
ALTER TABLE "timegate_salary_record" ADD CONSTRAINT "timegate_salary_record_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_salary_record" ADD CONSTRAINT "timegate_salary_record_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_payroll_run" ADD CONSTRAINT "timegate_payroll_run_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_payroll_line" ADD CONSTRAINT "timegate_payroll_line_payroll_run_fkey" FOREIGN KEY ("payroll_run") REFERENCES "timegate_payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_payroll_line" ADD CONSTRAINT "timegate_payroll_line_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
