-- Lot D #2 - Notification rules per tenant
CREATE TABLE IF NOT EXISTS "timegate_notification_rule" (
  "id" VARCHAR(140) PRIMARY KEY,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "company" VARCHAR(140) NOT NULL,
  "type" "TimeGateNotificationType" NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "push_enabled" BOOLEAN NOT NULL DEFAULT true,
  "email_enabled" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "timegate_notification_rule_company_fkey"
    FOREIGN KEY ("company") REFERENCES "tabCompany"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_notification_rule_company_type_key"
  ON "timegate_notification_rule" ("company", "type");

CREATE INDEX IF NOT EXISTS "timegate_notification_rule_company_idx"
  ON "timegate_notification_rule" ("company");
