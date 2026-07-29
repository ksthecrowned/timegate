-- CreateEnum
CREATE TYPE "CompensationItemKind" AS ENUM ('ALLOWANCE', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PayrollVariableSource" AS ENUM ('MANUAL', 'AUTO_RULE');

-- AlterTable
ALTER TABLE "timegate_payroll_line" ADD COLUMN     "fixed_allowances_total" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "fixed_deductions_total" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "gross" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "late_minutes_penalty" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "period_end" DATE,
ADD COLUMN     "period_start" DATE,
ADD COLUMN     "variable_allowances_total" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "variable_deductions_total" DECIMAL(21,9) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "timegate_compensation_grid" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "designation" VARCHAR(140) NOT NULL,
    "employment_type" VARCHAR(140) NOT NULL,
    "base_salary" DECIMAL(21,9) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,

    CONSTRAINT "timegate_compensation_grid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_employee_compensation_item" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "kind" "CompensationItemKind" NOT NULL,
    "amount" DECIMAL(21,9) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "timegate_employee_compensation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_payroll_variable_item" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "payroll_run" VARCHAR(140),
    "label" VARCHAR(200) NOT NULL,
    "kind" "CompensationItemKind" NOT NULL,
    "amount" DECIMAL(21,9) NOT NULL,
    "source" "PayrollVariableSource" NOT NULL DEFAULT 'MANUAL',
    "notes" VARCHAR(500),

    CONSTRAINT "timegate_payroll_variable_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timegate_compensation_grid_company_idx" ON "timegate_compensation_grid"("company");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_compensation_grid_company_designation_employment_t_key" ON "timegate_compensation_grid"("company", "designation", "employment_type", "effective_from");

-- CreateIndex
CREATE INDEX "timegate_employee_compensation_item_employee_idx" ON "timegate_employee_compensation_item"("employee");

-- CreateIndex
CREATE INDEX "timegate_employee_compensation_item_company_idx" ON "timegate_employee_compensation_item"("company");

-- CreateIndex
CREATE INDEX "timegate_payroll_variable_item_payroll_run_idx" ON "timegate_payroll_variable_item"("payroll_run");

-- CreateIndex
CREATE INDEX "timegate_payroll_variable_item_employee_idx" ON "timegate_payroll_variable_item"("employee");

-- AddForeignKey
ALTER TABLE "timegate_compensation_grid" ADD CONSTRAINT "timegate_compensation_grid_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_employee_compensation_item" ADD CONSTRAINT "timegate_employee_compensation_item_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_employee_compensation_item" ADD CONSTRAINT "timegate_employee_compensation_item_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_payroll_variable_item" ADD CONSTRAINT "timegate_payroll_variable_item_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_payroll_variable_item" ADD CONSTRAINT "timegate_payroll_variable_item_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_payroll_variable_item" ADD CONSTRAINT "timegate_payroll_variable_item_payroll_run_fkey" FOREIGN KEY ("payroll_run") REFERENCES "timegate_payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
