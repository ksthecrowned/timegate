-- CreateTable
CREATE TABLE "tabPasswordResetToken" (
    "id" VARCHAR(140) NOT NULL,
    "user" VARCHAR(140) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "reset_token_hash" VARCHAR(255) NOT NULL,
    "code_expires_at" TIMESTAMP(3) NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMP(3),
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tabPasswordResetToken_reset_token_hash_key" ON "tabPasswordResetToken"("reset_token_hash");

-- CreateIndex
CREATE INDEX "tabPasswordResetToken_user_code_expires_at_idx" ON "tabPasswordResetToken"("user", "code_expires_at");

-- AddForeignKey
ALTER TABLE "tabPasswordResetToken" ADD CONSTRAINT "tabPasswordResetToken_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
