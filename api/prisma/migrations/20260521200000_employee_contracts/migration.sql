-- Phase 16: employee contracts (TimeGate metadata + optional file URL)
CREATE TABLE "timegate_employee_contract" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL,
    "expires_at" DATE,
    "renewals_count" INTEGER NOT NULL DEFAULT 0,
    "contract_file_url" VARCHAR(2000),
    "notes" VARCHAR(2000),
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "timegate_employee_contract_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timegate_employee_contract_company_employee_idx" ON "timegate_employee_contract"("company", "employee");
CREATE INDEX "timegate_employee_contract_employee_is_current_idx" ON "timegate_employee_contract"("employee", "is_current");

ALTER TABLE "timegate_employee_contract" ADD CONSTRAINT "timegate_employee_contract_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_employee_contract" ADD CONSTRAINT "timegate_employee_contract_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
