-- Legacy PRO/demo orgs got max_locations=1 from the column default even when
-- they already operate multiple sites / elevated kiosk quotas. Align quotas +
-- multi_locations with seed PRO (maxLocations=20).

UPDATE "timegate_subscription"
SET "max_locations" = GREATEST("max_locations", 20)
WHERE UPPER("plan") IN ('PRO', 'ENTERPRISE', 'BUSINESS')
  AND "max_locations" < 20;

UPDATE "timegate_subscription_plan"
SET "max_locations" = GREATEST("max_locations", 20)
WHERE UPPER("code") IN ('PRO', 'ENTERPRISE', 'BUSINESS')
  AND "max_locations" < 20;

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_locations"]'::jsonb
WHERE (
    "max_locations" > 1
    OR "max_devices" > 1
    OR UPPER("plan") IN ('PRO', 'ENTERPRISE', 'BUSINESS')
  )
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_locations'));

UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["multi_locations"]'::jsonb
WHERE (
    "max_locations" > 1
    OR "max_devices" > 1
    OR UPPER("code") IN ('PRO', 'ENTERPRISE', 'BUSINESS')
  )
  AND ("capabilities" IS NULL OR NOT ("capabilities" ? 'multi_locations'));
