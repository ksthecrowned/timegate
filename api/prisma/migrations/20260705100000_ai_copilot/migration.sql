-- CreateTable
CREATE TABLE "timegate_ai_usage_record" (
    "id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "user_id" VARCHAR(140),
    "feature" VARCHAR(64) NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "model" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timegate_ai_usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_ai_copilot_session" (
    "id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "user_id" VARCHAR(140) NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timegate_ai_copilot_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timegate_ai_usage_record_company_created_at_idx" ON "timegate_ai_usage_record"("company", "created_at");

-- CreateIndex
CREATE INDEX "timegate_ai_copilot_session_company_user_id_updated_at_idx" ON "timegate_ai_copilot_session"("company", "user_id", "updated_at");
