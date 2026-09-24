-- Enable anomaly_workflow on existing plans/subscriptions that already have multi_* capabilities
UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["anomaly_workflow"]'::jsonb
WHERE "capabilities" IS NULL
   OR NOT ("capabilities" ? 'anomaly_workflow');

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["anomaly_workflow"]'::jsonb
WHERE "capabilities" IS NULL
   OR NOT ("capabilities" ? 'anomaly_workflow');
