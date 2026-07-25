-- Lightweight manager ↔ employee messaging
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE_RECEIVED';

CREATE TABLE IF NOT EXISTS "timegate_conversation" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "last_message_preview" VARCHAR(255),
    "created_by" VARCHAR(140) NOT NULL,

    CONSTRAINT "timegate_conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "timegate_message" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation" VARCHAR(140) NOT NULL,
    "sender" VARCHAR(140) NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "timegate_message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "timegate_conversation_read" (
    "id" VARCHAR(140) NOT NULL,
    "conversation" VARCHAR(140) NOT NULL,
    "user" VARCHAR(140) NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timegate_conversation_read_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "timegate_conversation_company_last_message_at_idx"
  ON "timegate_conversation"("company", "last_message_at");
CREATE INDEX IF NOT EXISTS "timegate_conversation_employee_last_message_at_idx"
  ON "timegate_conversation"("employee", "last_message_at");
CREATE INDEX IF NOT EXISTS "timegate_message_conversation_created_at_idx"
  ON "timegate_message"("conversation", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "timegate_conversation_read_conversation_user_key"
  ON "timegate_conversation_read"("conversation", "user");
CREATE INDEX IF NOT EXISTS "timegate_conversation_read_user_idx"
  ON "timegate_conversation_read"("user");

ALTER TABLE "timegate_conversation"
  ADD CONSTRAINT "timegate_conversation_company_fkey"
  FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_conversation"
  ADD CONSTRAINT "timegate_conversation_employee_fkey"
  FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_conversation"
  ADD CONSTRAINT "timegate_conversation_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_message"
  ADD CONSTRAINT "timegate_message_conversation_fkey"
  FOREIGN KEY ("conversation") REFERENCES "timegate_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_message"
  ADD CONSTRAINT "timegate_message_sender_fkey"
  FOREIGN KEY ("sender") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timegate_conversation_read"
  ADD CONSTRAINT "timegate_conversation_read_conversation_fkey"
  FOREIGN KEY ("conversation") REFERENCES "timegate_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_conversation_read"
  ADD CONSTRAINT "timegate_conversation_read_user_fkey"
  FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
