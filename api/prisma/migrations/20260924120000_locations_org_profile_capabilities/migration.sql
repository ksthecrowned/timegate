-- Locations + org profile + presence assignment location + capabilities/quotas

-- Company profile
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "industry_sector" VARCHAR(40);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "expected_site_count" VARCHAR(20);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "workforce_model" VARCHAR(40);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "schedule_pattern" VARCHAR(40);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "country_code" VARCHAR(10);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "referral_source" VARCHAR(40);
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "capabilities_opt_out" JSONB;

-- Platform / plans / subscriptions
ALTER TABLE "timegate_platform_settings" ADD COLUMN IF NOT EXISTS "trial_max_locations" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "timegate_subscription_plan" ADD COLUMN IF NOT EXISTS "max_locations" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "timegate_subscription_plan" ADD COLUMN IF NOT EXISTS "capabilities" JSONB;
ALTER TABLE "timegate_subscription" ADD COLUMN IF NOT EXISTS "max_locations" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "timegate_subscription" ADD COLUMN IF NOT EXISTS "capabilities" JSONB;

-- Location type enum
DO $$ BEGIN
  CREATE TYPE "TimeGateLocationType" AS ENUM ('BRANCH_SITE', 'CLIENT_SITE', 'TEMPORARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "timegate_location" (
  "id" VARCHAR(140) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "company" VARCHAR(140) NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "type" "TimeGateLocationType" NOT NULL DEFAULT 'BRANCH_SITE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "branch" VARCHAR(140),
  "time_zone" VARCHAR(140),
  "address" TEXT,
  "latitude" DECIMAL(21,7),
  "longitude" DECIMAL(21,7),
  "checkin_radius" INTEGER,
  "client_label" VARCHAR(140),
  CONSTRAINT "timegate_location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_location_branch_key" ON "timegate_location"("branch");
CREATE INDEX IF NOT EXISTS "timegate_location_company_is_active_idx" ON "timegate_location"("company", "is_active");

DO $$ BEGIN
  ALTER TABLE "timegate_location" ADD CONSTRAINT "timegate_location_company_fkey"
    FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "timegate_location" ADD CONSTRAINT "timegate_location_branch_fkey"
    FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Backfill locations from branches
INSERT INTO "timegate_location" (
  "id", "created_at", "updated_at", "company", "name", "type", "is_active",
  "branch", "time_zone", "address", "latitude", "longitude", "checkin_radius"
)
SELECT
  'LOC-' || b."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  b."company",
  b."branch",
  'BRANCH_SITE'::"TimeGateLocationType",
  COALESCE(b."is_active", true),
  b."id",
  b."time_zone",
  b."address",
  b."latitude",
  b."longitude",
  b."checkin_radius"
FROM "tabBranch" b
WHERE NOT EXISTS (
  SELECT 1 FROM "timegate_location" l WHERE l."branch" = b."id"
);

-- Employee home location
ALTER TABLE "tabEmployee" ADD COLUMN IF NOT EXISTS "home_location" VARCHAR(140);
CREATE INDEX IF NOT EXISTS "tabEmployee_home_location_idx" ON "tabEmployee"("home_location");

UPDATE "tabEmployee" e
SET "home_location" = l."id"
FROM "timegate_location" l
WHERE e."branch" = l."branch"
  AND e."home_location" IS NULL;

DO $$ BEGIN
  ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_home_location_fkey"
    FOREIGN KEY ("home_location") REFERENCES "timegate_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Kiosk location
ALTER TABLE "tabTimeGate Kiosk" ADD COLUMN IF NOT EXISTS "location" VARCHAR(140);

UPDATE "tabTimeGate Kiosk" k
SET "location" = l."id"
FROM "timegate_location" l
WHERE k."branch" = l."branch"
  AND k."location" IS NULL;

DO $$ BEGIN
  ALTER TABLE "tabTimeGate Kiosk" ADD CONSTRAINT "tabTimeGate Kiosk_location_fkey"
    FOREIGN KEY ("location") REFERENCES "timegate_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Shift assignment location
ALTER TABLE "tabShift Assignment" ADD COLUMN IF NOT EXISTS "location" VARCHAR(140);
CREATE INDEX IF NOT EXISTS "tabShift Assignment_location_idx" ON "tabShift Assignment"("location");

UPDATE "tabShift Assignment" a
SET "location" = e."home_location"
FROM "tabEmployee" e
WHERE a."employee" = e."id"
  AND a."location" IS NULL
  AND e."home_location" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "tabShift Assignment" ADD CONSTRAINT "tabShift Assignment_location_fkey"
    FOREIGN KEY ("location") REFERENCES "timegate_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
