-- CreateTable
CREATE TABLE "timegate_refresh_token" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_hash" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "subject_id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" VARCHAR(140),

    CONSTRAINT "timegate_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timegate_refresh_token_token_hash_key" ON "timegate_refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "timegate_refresh_token_subject_id_kind_idx" ON "timegate_refresh_token"("subject_id", "kind");

-- CreateIndex
CREATE INDEX "timegate_refresh_token_expires_at_idx" ON "timegate_refresh_token"("expires_at");
