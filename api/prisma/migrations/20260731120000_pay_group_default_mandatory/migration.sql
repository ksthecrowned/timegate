-- Mandatory default pay group per company + backfill employee assignments

-- AlterTable
ALTER TABLE "timegate_pay_group" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "timegate_pay_group_company_is_default_idx" ON "timegate_pay_group"("company", "is_default");

-- Companies without any pay group → create default "Paie mensuelle" (day 25)
INSERT INTO "timegate_pay_group" ("id", "creation", "modified", "company", "name", "pay_day_of_month", "is_default")
SELECT
  'PGRP-' || substr(md5(c."id" || clock_timestamp()::text || random()::text), 1, 16),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  c."id",
  'Paie mensuelle',
  25,
  true
FROM "tabCompany" c
WHERE NOT EXISTS (
  SELECT 1 FROM "timegate_pay_group" pg WHERE pg."company" = c."id"
);

-- Companies with groups but no default → mark the oldest as default
UPDATE "timegate_pay_group" pg
SET "is_default" = true
WHERE pg."id" IN (
  SELECT DISTINCT ON (pg2."company") pg2."id"
  FROM "timegate_pay_group" pg2
  WHERE NOT EXISTS (
    SELECT 1 FROM "timegate_pay_group" d
    WHERE d."company" = pg2."company" AND d."is_default" = true
  )
  ORDER BY pg2."company", pg2."creation" ASC, pg2."id" ASC
);

-- Assign employees without a pay group to their company default
UPDATE "tabEmployee" e
SET "pay_group" = d."id"
FROM "timegate_pay_group" d
WHERE e."pay_group" IS NULL
  AND d."company" = e."company"
  AND d."is_default" = true;

-- Harden FK: prevent deleting a pay group still referenced by employees
ALTER TABLE "tabEmployee" DROP CONSTRAINT IF EXISTS "tabEmployee_pay_group_fkey";
ALTER TABLE "tabEmployee"
  ADD CONSTRAINT "tabEmployee_pay_group_fkey"
  FOREIGN KEY ("pay_group") REFERENCES "timegate_pay_group"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
