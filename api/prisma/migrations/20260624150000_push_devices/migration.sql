-- CreateEnum
CREATE TYPE "TimeGateDevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateTable
CREATE TABLE "timegate_device" (
  "id" VARCHAR(140) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user" VARCHAR(140) NOT NULL,
  "token" VARCHAR(512) NOT NULL,
  "platform" "TimeGateDevicePlatform" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "timegate_device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timegate_device_token_key" ON "timegate_device"("token");

-- CreateIndex
CREATE INDEX "timegate_device_user_is_active_idx" ON "timegate_device"("user", "is_active");

-- AddForeignKey
ALTER TABLE "timegate_device" ADD CONSTRAINT "timegate_device_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
