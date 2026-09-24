-- Client mission + virtual QR kiosk
CREATE TYPE "TimeGateClientMissionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

CREATE TABLE "timegate_client_mission" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "status" "TimeGateClientMissionStatus" NOT NULL DEFAULT 'DRAFT',
    "location" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140) NOT NULL,
    "kiosk" VARCHAR(140) NOT NULL,
    "public_slug" VARCHAR(32) NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),

    CONSTRAINT "timegate_client_mission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timegate_client_mission_kiosk_key" ON "timegate_client_mission"("kiosk");
CREATE UNIQUE INDEX "timegate_client_mission_public_slug_key" ON "timegate_client_mission"("public_slug");
CREATE INDEX "timegate_client_mission_company_status_idx" ON "timegate_client_mission"("company", "status");
CREATE INDEX "timegate_client_mission_location_idx" ON "timegate_client_mission"("location");

ALTER TABLE "timegate_client_mission" ADD CONSTRAINT "timegate_client_mission_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_client_mission" ADD CONSTRAINT "timegate_client_mission_location_fkey" FOREIGN KEY ("location") REFERENCES "timegate_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timegate_client_mission" ADD CONSTRAINT "timegate_client_mission_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timegate_client_mission" ADD CONSTRAINT "timegate_client_mission_kiosk_fkey" FOREIGN KEY ("kiosk") REFERENCES "tabTimeGate Kiosk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable client_missions capability on plans/subscriptions
UPDATE "timegate_subscription_plan"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["client_missions"]'::jsonb
WHERE "capabilities" IS NULL
   OR NOT ("capabilities" ? 'client_missions');

UPDATE "timegate_subscription"
SET "capabilities" = COALESCE("capabilities", '[]'::jsonb) || '["client_missions"]'::jsonb
WHERE "capabilities" IS NULL
   OR NOT ("capabilities" ? 'client_missions');
