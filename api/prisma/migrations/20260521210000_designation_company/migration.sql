-- Phase 18: scope designations per company (multi-tenant)
ALTER TABLE "tabDesignation" ADD COLUMN IF NOT EXISTS "company" VARCHAR(140);

UPDATE "tabDesignation" SET "company" = (SELECT "id" FROM "tabCompany" LIMIT 1)
WHERE "company" IS NULL;

ALTER TABLE "tabDesignation" ALTER COLUMN "company" SET NOT NULL;

ALTER TABLE "tabDesignation" ADD CONSTRAINT "tabDesignation_company_fkey"
  FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "tabDesignation_company_designation_name_key"
  ON "tabDesignation"("company", "designation_name");
