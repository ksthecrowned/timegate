-- Scope employment types per company (multi-tenant) + metadata columns
ALTER TABLE "tabEmployment Type" ADD COLUMN IF NOT EXISTS "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tabEmployment Type" ADD COLUMN IF NOT EXISTS "modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tabEmployment Type" ADD COLUMN IF NOT EXISTS "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "tabEmployment Type" ADD COLUMN IF NOT EXISTS "company" VARCHAR(140);

-- Detach employees from legacy unscoped types, then clear orphans
UPDATE "tabEmployee" SET "employment_type" = NULL
WHERE "employment_type" IS NOT NULL
  AND "employment_type" IN (
    SELECT "id" FROM "tabEmployment Type" WHERE "company" IS NULL
  );

DELETE FROM "tabEmployment Type" WHERE "company" IS NULL;

-- If any rows remain without company (shouldn't), assign first company or delete
UPDATE "tabEmployment Type" SET "company" = (SELECT "id" FROM "tabCompany" LIMIT 1)
WHERE "company" IS NULL;

DELETE FROM "tabEmployment Type" WHERE "company" IS NULL;

ALTER TABLE "tabEmployment Type" ALTER COLUMN "company" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tabEmployment Type_company_fkey'
  ) THEN
    ALTER TABLE "tabEmployment Type"
      ADD CONSTRAINT "tabEmployment Type_company_fkey"
      FOREIGN KEY ("company") REFERENCES "tabCompany"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "tabEmployment Type_company_employee_type_name_key"
  ON "tabEmployment Type"("company", "employee_type_name");
