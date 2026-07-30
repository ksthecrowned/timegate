-- Pay groups, payroll mass totals, and deferred line-level payments

-- CreateEnum
CREATE TYPE "PayrollLinePaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterEnum
ALTER TYPE "TimeGatePayrollRunStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- AlterEnum
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_DUE_SOON';
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_OVERDUE';

-- CreateTable
CREATE TABLE "timegate_pay_group" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "pay_day_of_month" INTEGER NOT NULL,

    CONSTRAINT "timegate_pay_group_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tabEmployee" ADD COLUMN     "pay_group" VARCHAR(140),
ADD COLUMN     "pay_due_day_override" INTEGER;

-- AlterTable
ALTER TABLE "timegate_payroll_run" ADD COLUMN     "total_base_salary" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_fixed_allowances" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_fixed_deductions" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_variable_allowances" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_variable_deductions" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_overtime" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_penalties" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_gross" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "total_net" DECIMAL(21,9) NOT NULL DEFAULT 0,
ADD COLUMN     "lines_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paid_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unpaid_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "timegate_payroll_line" ADD COLUMN     "due_date" DATE,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_status" "PayrollLinePaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "timegate_pay_group_company_idx" ON "timegate_pay_group"("company");

-- CreateIndex
CREATE INDEX "timegate_payroll_line_payroll_run_payment_status_idx" ON "timegate_payroll_line"("payroll_run", "payment_status");

-- CreateIndex
CREATE INDEX "timegate_payroll_line_payroll_run_due_date_idx" ON "timegate_payroll_line"("payroll_run", "due_date");

-- AddForeignKey
ALTER TABLE "timegate_pay_group" ADD CONSTRAINT "timegate_pay_group_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_pay_group_fkey" FOREIGN KEY ("pay_group") REFERENCES "timegate_pay_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
