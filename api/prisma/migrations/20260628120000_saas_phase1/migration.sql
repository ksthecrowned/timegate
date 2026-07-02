-- Lot I phase 1: platform settings, subscription plans, subscription lifecycle

CREATE TYPE "TimeGateSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE_READ_ONLY', 'BLOCKED', 'SUSPENDED');
CREATE TYPE "TimeGateSubscriptionSource" AS ENUM ('SELF_SIGNUP', 'ACTIVATION_KEY', 'MANUAL');

ALTER TABLE "tabCompany" ADD COLUMN "suspended_at" TIMESTAMP(3);

CREATE TABLE "timegate_platform_settings" (
    "id" VARCHAR(140) NOT NULL DEFAULT 'PLATFORM',
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "trial_max_employees" INTEGER NOT NULL DEFAULT 10,
    "trial_max_kiosks" INTEGER NOT NULL DEFAULT 1,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timegate_platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timegate_subscription_plan" (
    "id" VARCHAR(140) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(140) NOT NULL,
    "max_employees" INTEGER NOT NULL,
    "max_devices" INTEGER NOT NULL,
    "duration_days" INTEGER,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timegate_subscription_plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timegate_subscription_plan_code_key" ON "timegate_subscription_plan"("code");

ALTER TABLE "timegate_subscription"
    ADD COLUMN "plan_id" VARCHAR(140),
    ADD COLUMN "status" "TimeGateSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "source" "TimeGateSubscriptionSource" NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN "trial_ends_at" TIMESTAMP(3),
    ADD COLUMN "grace_ends_at" TIMESTAMP(3);

ALTER TABLE "timegate_activation_key" ADD COLUMN "plan_id" VARCHAR(140);

CREATE INDEX "timegate_subscription_status_expires_at_idx" ON "timegate_subscription"("status", "expiresAt");

ALTER TABLE "timegate_subscription"
    ADD CONSTRAINT "timegate_subscription_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "timegate_subscription_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timegate_activation_key"
    ADD CONSTRAINT "timegate_activation_key_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "timegate_subscription_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "timegate_platform_settings" ("id", "trial_days", "trial_max_employees", "trial_max_kiosks", "grace_period_days", "updated_at")
VALUES ('PLATFORM', 14, 10, 1, 7, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "timegate_subscription_plan" ("id", "code", "label", "max_employees", "max_devices", "duration_days", "sort_order", "updated_at")
VALUES
    ('PLN-STARTER', 'STARTER', 'Starter', 25, 2, 365, 10, CURRENT_TIMESTAMP),
    ('PLN-PRO', 'PRO', 'Pro', 200, 20, 365, 20, CURRENT_TIMESTAMP),
    ('PLN-ENTERPRISE', 'ENTERPRISE', 'Enterprise', 2000, 100, NULL, 30, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "timegate_subscription"
SET "status" = CASE
    WHEN "expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP THEN 'ACTIVE'::"TimeGateSubscriptionStatus"
    WHEN "expiresAt" + INTERVAL '7 days' > CURRENT_TIMESTAMP THEN 'GRACE_READ_ONLY'::"TimeGateSubscriptionStatus"
    ELSE 'BLOCKED'::"TimeGateSubscriptionStatus"
END,
"source" = 'MANUAL'::"TimeGateSubscriptionSource",
"grace_ends_at" = CASE
    WHEN "expiresAt" IS NOT NULL AND "expiresAt" <= CURRENT_TIMESTAMP
        THEN "expiresAt" + INTERVAL '7 days'
    ELSE NULL
END;

UPDATE "timegate_subscription" s
SET "plan_id" = p."id"
FROM "timegate_subscription_plan" p
WHERE UPPER(s."plan") = p."code";

ALTER TYPE "TimeGateNotificationType" ADD VALUE 'SUBSCRIPTION_TRIAL_REMINDER';
ALTER TYPE "TimeGateNotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRING';
ALTER TYPE "TimeGateNotificationType" ADD VALUE 'SUBSCRIPTION_GRACE';
ALTER TYPE "TimeGateNotificationType" ADD VALUE 'SUBSCRIPTION_BLOCKED';
