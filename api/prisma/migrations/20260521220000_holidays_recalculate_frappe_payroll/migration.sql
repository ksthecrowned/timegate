-- Phase 26: ON_HOLIDAY + employee holiday_list
-- Phase 28: Frappe payroll / accounting models

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'ON_HOLIDAY';

-- CreateEnum
CREATE TYPE "PayrollEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "tabEmployee" ADD COLUMN "holiday_list" VARCHAR(140);

-- CreateTable
CREATE TABLE "tabAccount" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "account_name" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "account_type" VARCHAR(140),
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "parent_account" VARCHAR(140),

    CONSTRAINT "tabAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabSalary Component" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "salary_component" VARCHAR(140) NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "company" VARCHAR(140),
    "is_tax_applicable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tabSalary Component_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabSalary Structure" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "name" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "payroll_frequency" VARCHAR(140),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tabSalary Structure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabSalary Structure Detail" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "parent" VARCHAR(140) NOT NULL,
    "salary_component" VARCHAR(140) NOT NULL,
    "amount" DECIMAL(21,9),
    "formula" VARCHAR(500),

    CONSTRAINT "tabSalary Structure Detail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabSalary Structure Assignment" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "salary_structure" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "from_date" DATE,
    "to_date" DATE,

    CONSTRAINT "tabSalary Structure Assignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabPayroll Entry" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "company" VARCHAR(140),
    "start_date" DATE,
    "end_date" DATE,
    "status" "PayrollEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "posting_date" DATE,

    CONSTRAINT "tabPayroll Entry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tabPayment Entry" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "company" VARCHAR(140),
    "payment_type" "PaymentEntryType" NOT NULL,
    "posting_date" DATE,
    "paid_amount" DECIMAL(21,9),
    "party_type" VARCHAR(140),
    "party" VARCHAR(140),

    CONSTRAINT "tabPayment Entry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tabSalary Slip" ADD COLUMN "payroll_entry" VARCHAR(140);

-- CreateIndex
CREATE UNIQUE INDEX "tabAccount_company_account_name_key" ON "tabAccount"("company", "account_name");
CREATE UNIQUE INDEX "tabSalary Component_company_salary_component_key" ON "tabSalary Component"("company", "salary_component");
CREATE UNIQUE INDEX "tabSalary Structure_company_name_key" ON "tabSalary Structure"("company", "name");
CREATE INDEX "tabSalary Structure Assignment_employee_from_date_idx" ON "tabSalary Structure Assignment"("employee", "from_date");
CREATE INDEX "tabPayroll Entry_company_start_date_idx" ON "tabPayroll Entry"("company", "start_date");
CREATE INDEX "tabPayment Entry_company_posting_date_idx" ON "tabPayment Entry"("company", "posting_date");
CREATE INDEX "tabSalary Slip_payroll_entry_idx" ON "tabSalary Slip"("payroll_entry");

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_holiday_list_fkey" FOREIGN KEY ("holiday_list") REFERENCES "tabHoliday List"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabCompany" ADD CONSTRAINT "tabCompany_default_payroll_payable_account_fkey" FOREIGN KEY ("default_payroll_payable_account") REFERENCES "tabAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabAccount" ADD CONSTRAINT "tabAccount_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabSalary Component" ADD CONSTRAINT "tabSalary Component_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure" ADD CONSTRAINT "tabSalary Structure_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure Detail" ADD CONSTRAINT "tabSalary Structure Detail_parent_fkey" FOREIGN KEY ("parent") REFERENCES "tabSalary Structure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure Detail" ADD CONSTRAINT "tabSalary Structure Detail_salary_component_fkey" FOREIGN KEY ("salary_component") REFERENCES "tabSalary Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure Assignment" ADD CONSTRAINT "tabSalary Structure Assignment_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure Assignment" ADD CONSTRAINT "tabSalary Structure Assignment_salary_structure_fkey" FOREIGN KEY ("salary_structure") REFERENCES "tabSalary Structure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tabSalary Structure Assignment" ADD CONSTRAINT "tabSalary Structure Assignment_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabPayroll Entry" ADD CONSTRAINT "tabPayroll Entry_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabPayment Entry" ADD CONSTRAINT "tabPayment Entry_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tabSalary Slip" ADD CONSTRAINT "tabSalary Slip_payroll_entry_fkey" FOREIGN KEY ("payroll_entry") REFERENCES "tabPayroll Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
