-- Manager scope by punch location (F — scoped_managers)
CREATE TABLE IF NOT EXISTS "timegate_user_location" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" VARCHAR(140) NOT NULL,
    "location" VARCHAR(140) NOT NULL,

    CONSTRAINT "timegate_user_location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "timegate_user_location_user_location_key"
  ON "timegate_user_location"("user", "location");

CREATE INDEX IF NOT EXISTS "timegate_user_location_location_idx"
  ON "timegate_user_location"("location");

DO $$ BEGIN
  ALTER TABLE "timegate_user_location"
    ADD CONSTRAINT "timegate_user_location_user_fkey"
    FOREIGN KEY ("user") REFERENCES "tabUser"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "timegate_user_location"
    ADD CONSTRAINT "timegate_user_location_location_fkey"
    FOREIGN KEY ("location") REFERENCES "timegate_location"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
