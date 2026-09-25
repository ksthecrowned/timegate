-- Backfill multi_locations / multi_kiosks / scoped_managers on elevated plans & subscriptions.
-- Earlier migrations added the columns and other caps (anomaly_workflow, client_missions)
-- but left PRO/demo orgs without the multi_* gates required for branch/location creation.
-- Note: maxKiosks is stored as max_devices on both plan and subscription tables.

UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_locations"]'::jsonb
WHERE "max_locations" > 1
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_locations'));

UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_kiosks"]'::jsonb
WHERE "max_devices" > 1
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_kiosks'));

UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["scoped_managers"]'::jsonb
WHERE ("max_locations" > 1 OR "max_devices" > 1)
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'scoped_managers'));

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_locations"]'::jsonb
WHERE "max_locations" > 1
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_locations'));

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_kiosks"]'::jsonb
WHERE "max_devices" > 1
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_kiosks'));

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["scoped_managers"]'::jsonb
WHERE ("max_locations" > 1 OR "max_devices" > 1 OR UPPER("plan") IN ('PRO', 'ENTERPRISE', 'BUSINESS'))
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'scoped_managers'));
