-- Deduplicate names within a company before enforcing uniqueness (keep oldest).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY company, name ORDER BY creation ASC, id ASC) AS rn
  FROM timegate_pay_group
)
DELETE FROM timegate_pay_group
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "timegate_pay_group_company_name_key" ON "timegate_pay_group"("company", "name");
