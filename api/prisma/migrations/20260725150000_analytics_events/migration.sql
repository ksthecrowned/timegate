-- Product analytics events (employee funnels)
CREATE TABLE IF NOT EXISTS "timegate_analytics_event" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" VARCHAR(140) NOT NULL,
    "user_id" VARCHAR(140),
    "event" VARCHAR(64) NOT NULL,
    "platform" VARCHAR(16),

    CONSTRAINT "timegate_analytics_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "timegate_analytics_event_company_created_at_idx"
  ON "timegate_analytics_event"("company", "created_at");
CREATE INDEX IF NOT EXISTS "timegate_analytics_event_company_event_created_at_idx"
  ON "timegate_analytics_event"("company", "event", "created_at");
